/**
 * Tests for CloudflareClient
 */

import { describe, it, expect } from "vitest";
import { CloudflareClient, CloudflareAPIError } from "../src/cloudflare/client.js";

describe("CloudflareClient", () => {
  describe("constructor", () => {
    it("throws error when token is empty", () => {
      expect(() => new CloudflareClient("")).toThrow("API token is required");
    });

    it("accepts valid token", () => {
      const client = new CloudflareClient("valid-token");
      expect(client).toBeInstanceOf(CloudflareClient);
    });
  });

  describe("resolveZoneId", () => {
    it("returns zone ID directly if it looks like one (32 hex chars)", async () => {
      const client = new CloudflareClient("test-token");
      // 32 char hex string should be returned as-is without API call
      const zoneId = "0123456789abcdef0123456789abcdef";
      const result = await client.resolveZoneId(zoneId);
      expect(result).toBe(zoneId);
    });

    it("treats uppercase hex as zone ID", async () => {
      const client = new CloudflareClient("test-token");
      const zoneId = "ABCDEF0123456789ABCDEF0123456789";
      const result = await client.resolveZoneId(zoneId);
      expect(result).toBe(zoneId);
    });
  });
});

describe("CloudflareAPIError", () => {
  it("creates error with single error", () => {
    const error = new CloudflareAPIError([
      { code: 1000, message: "Test error" },
    ]);
    expect(error.message).toContain("[1000]");
    expect(error.message).toContain("Test error");
    expect(error.errors).toHaveLength(1);
    expect(error.name).toBe("CloudflareAPIError");
  });

  it("creates error with multiple errors", () => {
    const error = new CloudflareAPIError([
      { code: 1001, message: "First error" },
      { code: 1002, message: "Second error" },
    ]);
    expect(error.message).toContain("First error");
    expect(error.message).toContain("Second error");
    expect(error.errors).toHaveLength(2);
  });

  it("includes status code when provided", () => {
    const error = new CloudflareAPIError(
      [{ code: 1000, message: "Test" }],
      403
    );
    expect(error.statusCode).toBe(403);
  });

  it("status code is undefined when not provided", () => {
    const error = new CloudflareAPIError([{ code: 1000, message: "Test" }]);
    expect(error.statusCode).toBeUndefined();
  });
});
