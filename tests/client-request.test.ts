/**
 * Tests for CloudflareClient.request() behavior against a mocked fetch:
 * success/error envelopes, non-JSON bodies, empty bodies, and status capture.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { CloudflareClient, CloudflareAPIError } from "../src/cloudflare/client.js";

function mockFetch(body: string, status: number, statusText = "") {
  return vi.fn(
    async () =>
      new Response(body, {
        status,
        statusText,
        headers: { "Content-Type": "application/json" },
      })
  );
}

const okEnvelope = JSON.stringify({
  success: true,
  errors: [],
  messages: [],
  result: [],
  result_info: { page: 1, per_page: 50, total_pages: 1, count: 0, total_count: 0 },
});

describe("CloudflareClient.request", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed data on a successful envelope", async () => {
    vi.stubGlobal("fetch", mockFetch(okEnvelope, 200));
    const client = new CloudflareClient("token");
    const res = await client.listZones();
    expect(res.success).toBe(true);
    expect(Array.isArray(res.result)).toBe(true);
  });

  it("throws CloudflareAPIError with status on an error envelope", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(
        JSON.stringify({
          success: false,
          errors: [{ code: 1003, message: "Invalid something" }],
          messages: [],
          result: null,
        }),
        400,
        "Bad Request"
      )
    );
    const client = new CloudflareClient("token");
    await expect(client.listZones()).rejects.toBeInstanceOf(CloudflareAPIError);
    await expect(client.listZones()).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("wraps a non-JSON body (e.g. proxy HTML page) in a CloudflareAPIError", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch("<html><body>502 Bad Gateway</body></html>", 502, "Bad Gateway")
    );
    const client = new CloudflareClient("token");
    const err = await client.listZones().catch((e) => e);
    expect(err).toBeInstanceOf(CloudflareAPIError);
    expect(err.statusCode).toBe(502);
    expect(err.message).toContain("non-JSON");
  });

  it("captures a 429 rate-limit status", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(
        JSON.stringify({
          success: false,
          errors: [{ code: 10000, message: "Rate limited" }],
          messages: [],
          result: null,
        }),
        429,
        "Too Many Requests"
      )
    );
    const client = new CloudflareClient("token");
    const err = await client.listZones().catch((e) => e);
    expect(err).toBeInstanceOf(CloudflareAPIError);
    expect(err.statusCode).toBe(429);
  });

  it("throws when an error envelope has an empty errors array", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(
        JSON.stringify({ success: false, errors: [], messages: [], result: null }),
        500,
        "Internal Server Error"
      )
    );
    const client = new CloudflareClient("token");
    const err = await client.listZones().catch((e) => e);
    expect(err).toBeInstanceOf(CloudflareAPIError);
    expect(err.statusCode).toBe(500);
    // Falls back to statusText when the API omits structured errors
    expect(err.message).toContain("Internal Server Error");
  });
});

describe("CloudflareClient.resolveZoneId (domain-name path)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves a domain name to its zone id via an exact match", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: [
            { id: "z1", name: "other.com" },
            { id: "0123456789abcdef0123456789abcdef", name: "example.com" },
          ],
        }),
        200
      )
    );
    const client = new CloudflareClient("token");
    const id = await client.resolveZoneId("example.com");
    expect(id).toBe("0123456789abcdef0123456789abcdef");
  });

  it("throws a CloudflareAPIError when no matching zone is found", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(
        JSON.stringify({ success: true, errors: [], messages: [], result: [] }),
        200
      )
    );
    const client = new CloudflareClient("token");
    await expect(client.resolveZoneId("missing.com")).rejects.toBeInstanceOf(
      CloudflareAPIError
    );
  });
});
