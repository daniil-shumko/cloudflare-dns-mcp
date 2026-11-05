/**
 * Tests for tool handlers: inputs (already validated by the SDK, so parsed
 * here with the same schemas) are forwarded to the Cloudflare client correctly.
 */

import { describe, it, expect } from "vitest";
import {
  handleCreateDNSRecord,
  handleUpdateDNSRecord,
} from "../src/tools/handlers.js";
import {
  CreateDNSRecordSchema,
  UpdateDNSRecordSchema,
} from "../src/tools/schemas.js";
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

describe("handleCreateDNSRecord", () => {
  it("forwards structured data (CAA) to the client", async () => {
    let captured: Record<string, unknown> | undefined;
    const fake = {
      createDNSRecord: async (_zoneId: string, record: Record<string, unknown>) => {
        captured = record;
        return dnsRecordResult({ type: "CAA", name: "example.com", content: '0 issue "letsencrypt.org"' });
      },
    } as unknown as CloudflareClient;

    await handleCreateDNSRecord(fake, CreateDNSRecordSchema.parse({
      zone_id: "abc123",
      type: "CAA",
      name: "example.com",
      data: { flags: 0, tag: "issue", value: "letsencrypt.org" },
    }));

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

    await handleUpdateDNSRecord(fake, UpdateDNSRecordSchema.parse({
      zone_id: "abc123",
      record_id: "rec1",
      priority: 20,
    }));

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

    await handleUpdateDNSRecord(fake, UpdateDNSRecordSchema.parse({
      zone_id: "abc123",
      record_id: "rec1",
      content: "5.6.7.8",
    }));

    expect(captured).toEqual({ content: "5.6.7.8" });
    expect("priority" in (captured ?? {})).toBe(false);
  });

  it("drops a type equal to the current one instead of sending it in the PATCH", async () => {
    let captured: Record<string, unknown> | undefined;
    const fake = {
      getDNSRecord: async () => dnsRecordResult(),
      updateDNSRecord: async (
        _zoneId: string,
        _recordId: string,
        data: Record<string, unknown>
      ) => {
        captured = data;
        return dnsRecordResult({ content: "5.6.7.8" });
      },
    } as unknown as CloudflareClient;

    await handleUpdateDNSRecord(fake, UpdateDNSRecordSchema.parse({
      zone_id: "abc123",
      record_id: "rec1",
      type: "A",
      content: "5.6.7.8",
    }));

    expect(captured).toEqual({ content: "5.6.7.8" });
  });

  it("replaces the record via an atomic batch when the type changes", async () => {
    let captured: Record<string, unknown> | undefined;
    let patched = false;
    const fake = {
      getDNSRecord: async () =>
        dnsRecordResult({
          proxied: true,
          ttl: 300,
          comment: "web",
          tags: ["team:web"],
        }),
      updateDNSRecord: async () => {
        patched = true;
      },
      batchDNSRecords: async (_zoneId: string, batch: Record<string, unknown>) => {
        captured = batch;
        return {
          success: true,
          errors: [],
          messages: [],
          result: {
            deletes: [dnsRecordResult().result],
            posts: [
              dnsRecordResult({ id: "rec2", type: "TXT", content: "hello", proxied: false, ttl: 300 })
                .result,
            ],
          },
        };
      },
    } as unknown as CloudflareClient;

    const res = await handleUpdateDNSRecord(fake, UpdateDNSRecordSchema.parse({
      zone_id: "abc123",
      record_id: "rec1",
      type: "TXT",
      content: "hello",
    }));

    expect(patched).toBe(false);
    expect(captured).toEqual({
      deletes: [{ id: "rec1" }],
      posts: [
        {
          type: "TXT",
          name: "www.example.com",
          content: "hello",
          ttl: 300,
          comment: "web",
          tags: ["team:web"],
          // proxied is not carried over: TXT records cannot be proxied
        },
      ],
    });
    const body = parseToolText(res);
    expect(body.data.id).toBe("rec2");
    expect(body.data.replaced_record_id).toBe("rec1");
  });

  it("requires new content when changing the type", async () => {
    let batched = false;
    const fake = {
      getDNSRecord: async () => dnsRecordResult(),
      batchDNSRecords: async () => {
        batched = true;
      },
    } as unknown as CloudflareClient;

    const res = await handleUpdateDNSRecord(fake, UpdateDNSRecordSchema.parse({
      zone_id: "abc123",
      record_id: "rec1",
      type: "AAAA",
    }));

    expect(res.isError).toBe(true);
    expect(parseToolText(res).code).toBe("VALIDATION_ERROR");
    expect(batched).toBe(false);
  });
});
