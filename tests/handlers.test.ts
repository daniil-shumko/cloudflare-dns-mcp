/**
 * Tests for tool handlers: dispatcher behavior and that inputs are forwarded
 * to the Cloudflare client correctly (using a lightweight fake client).
 */

import { describe, it, expect } from "vitest";
import {
  handleToolCall,
  handleCreateDNSRecord,
  handleUpdateDNSRecord,
} from "../src/tools/handlers.js";
import type { CloudflareClient } from "../src/cloudflare/client.js";

function dnsRecordResult(overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    errors: [],
    messages: [],
    result: {
      id: "rec1",
      type: "A",
      name: "www.example.com",
      content: "1.2.3.4",
      proxiable: true,
      proxied: false,
      ttl: 1,
      meta: {},
      comment: null,
      tags: [],
      created_on: "2024-01-01T00:00:00Z",
      modified_on: "2024-01-01T00:00:00Z",
      ...overrides,
    },
  };
}

function parseToolText(res: { content: Array<{ text: string }> }) {
  return JSON.parse(res.content[0].text);
}

describe("handleToolCall dispatcher", () => {
  it("returns an error response for an unknown tool", async () => {
    const fake = {} as unknown as CloudflareClient;
    const res = await handleToolCall(fake, "does_not_exist", {});
    expect(res.isError).toBe(true);
    const body = parseToolText(res);
    expect(body.error).toBe(true);
    expect(body.message).toContain("Unknown tool");
  });
});

describe("handleCreateDNSRecord", () => {
  it("forwards structured data (CAA) to the client", async () => {
    let captured: Record<string, unknown> | undefined;
    const fake = {
      createDNSRecord: async (_zoneId: string, record: Record<string, unknown>) => {
        captured = record;
        return dnsRecordResult({ type: "CAA", name: "example.com", content: '0 issue "letsencrypt.org"' });
      },
    } as unknown as CloudflareClient;

    await handleCreateDNSRecord(fake, {
      zone_id: "abc123",
      type: "CAA",
      name: "example.com",
      data: { flags: 0, tag: "issue", value: "letsencrypt.org" },
    });

    expect(captured?.data).toEqual({ flags: 0, tag: "issue", value: "letsencrypt.org" });
    expect(captured?.type).toBe("CAA");
  });
});

describe("handleUpdateDNSRecord", () => {
  it("forwards a priority change to the client (MX/URI)", async () => {
    let captured: Record<string, unknown> | undefined;
    const fake = {
      updateDNSRecord: async (
        _zoneId: string,
        _recordId: string,
        data: Record<string, unknown>
      ) => {
        captured = data;
        return dnsRecordResult({ type: "MX", priority: 20, content: "mail.example.com" });
      },
    } as unknown as CloudflareClient;

    await handleUpdateDNSRecord(fake, {
      zone_id: "abc123",
      record_id: "rec1",
      priority: 20,
    });

    expect(captured?.priority).toBe(20);
  });

  it("only forwards fields that were provided (partial update)", async () => {
    let captured: Record<string, unknown> | undefined;
    const fake = {
      updateDNSRecord: async (
        _zoneId: string,
        _recordId: string,
        data: Record<string, unknown>
      ) => {
        captured = data;
        return dnsRecordResult({ content: "5.6.7.8" });
      },
    } as unknown as CloudflareClient;

    await handleUpdateDNSRecord(fake, {
      zone_id: "abc123",
      record_id: "rec1",
      content: "5.6.7.8",
    });

    expect(captured).toEqual({ content: "5.6.7.8" });
    expect("priority" in (captured ?? {})).toBe(false);
  });
});
