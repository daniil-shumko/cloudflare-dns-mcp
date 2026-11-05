/**
 * Protocol-level tests: a real MCP client talks to createServer() over an
 * in-memory transport, with the Cloudflare API stubbed via fetch.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";

import { CloudflareClient } from "../src/cloudflare/client.js";
import { createServer } from "../src/server.js";

const ZONE_ID = "0123456789abcdef0123456789abcdef";

type FetchHandler = (url: URL, init?: RequestInit) => {
  status?: number;
  body: unknown;
  headers?: Record<string, string>;
};

function stubCloudflare(handler: FetchHandler) {
  const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const { status = 200, body, headers } = handler(new URL(String(input)), init);
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...headers },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function ok(result: unknown, result_info?: unknown) {
  return { body: { success: true, errors: [], messages: [], result, result_info } };
}

function textOf(result: { content?: unknown }) {
  const content = result.content as Array<{ type: string; text: string }>;
  return JSON.parse(content[0].text);
}

let client: Client;

beforeEach(async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer(new CloudflareClient("test-token"));
  await server.connect(serverTransport);
  client = new Client({ name: "test-client", version: "0.0.0" });
  await client.connect(clientTransport);
});

afterEach(async () => {
  await client.close();
  vi.unstubAllGlobals();
});

describe("tools/list", () => {
  it("advertises all 10 tools with titles, annotations and JSON Schemas", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual([
      "add_zone",
      "list_zones",
      "get_zone_details",
      "list_dns_records",
      "get_dns_record",
      "create_dns_record",
      "update_dns_record",
      "delete_dns_record",
      "find_dns_records",
      "backup_dns_records",
    ]);
    for (const tool of tools) {
      expect(tool.title).toBeTruthy();
      expect(tool.annotations?.title).toBe(tool.title);
      expect(tool.inputSchema.type).toBe("object");
    }
  });

  it("publishes descriptions, enums and required fields from the Zod schemas", async () => {
    const { tools } = await client.listTools();
    const create = tools.find((t) => t.name === "create_dns_record")!;
    const props = create.inputSchema.properties as Record<
      string,
      { description?: string; enum?: string[] }
    >;
    expect(create.inputSchema.required).toEqual(["type", "name"]);
    expect(props.type.enum).toContain("CAA");
    expect(props.name.description).toMatch(/record name/i);

    const getRecord = tools.find((t) => t.name === "get_dns_record")!;
    expect(getRecord.inputSchema.required).toEqual(["zone_id", "record_id"]);
  });

  it("reports server info including description and websiteUrl", () => {
    const info = client.getServerVersion();
    expect(info?.name).toBe("cloudflare-dns");
    expect(info?.description).toMatch(/Cloudflare/);
    expect(info?.websiteUrl).toMatch(/^https:\/\/github\.com\//);
  });
});

describe("tools/call", () => {
  it("accepts a call with no arguments for all-optional tools", async () => {
    stubCloudflare(() =>
      ok([], { page: 1, per_page: 50, total_pages: 1, count: 0, total_count: 0 })
    );
    const result = await client.callTool({ name: "list_zones" });
    expect(result.isError).toBeFalsy();
    expect(textOf(result).success).toBe(true);
  });

  it("applies schema defaults before the handler runs", async () => {
    const fetchMock = stubCloudflare(() => ok([]));
    await client.callTool({ name: "list_zones", arguments: {} });
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("per_page")).toBe("50");
  });

  it("returns refine() validation failures as tool errors", async () => {
    const fetchMock = stubCloudflare(() => ok([]));
    const result = await client.callTool({
      name: "create_dns_record",
      arguments: { type: "A", name: "www" },
    });
    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ text: string }>)[0].text;
    expect(text).toContain("Either zone_id or domain_name is required");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown tool", async () => {
    const outcome = await client
      .callTool({ name: "does_not_exist", arguments: {} })
      .then((r) => ({ isError: r.isError }), (e: Error) => ({ error: e.message }));
    // Spec: unknown tools are a protocol error (-32602); some SDK versions
    // surface it as an isError result instead. Either way, it must fail.
    expect("error" in outcome ? outcome.error : outcome.isError).toBeTruthy();
  });

  it("returns Cloudflare API errors as structured JSON with a suggestion", async () => {
    stubCloudflare(() => ({
      status: 403,
      body: {
        success: false,
        errors: [
          {
            code: 9109,
            message: "Unauthorized to access requested resource",
            documentation_url: "https://developers.cloudflare.com/fundamentals/api/",
          },
        ],
        messages: [],
        result: null,
      },
    }));
    const result = await client.callTool({
      name: "get_dns_record",
      arguments: { zone_id: ZONE_ID, record_id: "rec1" },
    });
    expect(result.isError).toBe(true);
    const body = textOf(result);
    expect(body.code).toBe("CF_9109");
    expect(body.suggestion).toMatch(/CLOUDFLARE_API_TOKEN/);
    expect(body.documentation_url).toBe(
      "https://developers.cloudflare.com/fundamentals/api/"
    );
  });

  it("resolves a domain name and returns records", async () => {
    stubCloudflare((url) => {
      if (url.pathname.endsWith("/zones")) {
        return ok([{ id: ZONE_ID, name: "example.com" }]);
      }
      return ok([
        {
          id: "rec1",
          type: "A",
          name: "www.example.com",
          content: "192.0.2.1",
          proxied: false,
          proxiable: true,
          ttl: 1,
          comment: null,
          tags: [],
          meta: {},
          created_on: "2026-01-01T00:00:00Z",
          modified_on: "2026-01-01T00:00:00Z",
        },
      ]);
    });
    const result = await client.callTool({
      name: "find_dns_records",
      arguments: { domain_name: "example.com", record_name: "www.example.com" },
    });
    expect(result.isError).toBeFalsy();
    const body = textOf(result);
    expect(body.data.zone_id).toBe(ZONE_ID);
    expect(body.data.records[0]).toMatchObject({
      id: "rec1",
      content: "192.0.2.1",
      ttl: "auto",
    });
  });
});

describe("structured output (read tools)", () => {
  const READ_TOOLS_WITH_OUTPUT = [
    "list_zones",
    "get_zone_details",
    "list_dns_records",
    "get_dns_record",
    "find_dns_records",
  ];

  it("declares an outputSchema on exactly the read tools (not backup or writes)", async () => {
    const { tools } = await client.listTools();
    const withOutput = tools.filter((t) => t.outputSchema).map((t) => t.name);
    expect(withOutput).toEqual(READ_TOOLS_WITH_OUTPUT);
  });

  it("returns structuredContent identical to the JSON text", async () => {
    stubCloudflare(() =>
      ok(
        [
          {
            id: ZONE_ID,
            name: "example.com",
            status: "active",
            name_servers: ["ns1.example.net"],
            plan: { name: "Free Website" },
            created_on: "2026-01-01T00:00:00Z",
            modified_on: "2026-01-01T00:00:00Z",
          },
        ],
        { page: 1, per_page: 50, total_pages: 1, count: 1, total_count: 1 }
      )
    );
    const result = await client.callTool({ name: "list_zones", arguments: {} });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual(textOf(result));
    expect(result.structuredContent).toMatchObject({
      success: true,
      data: { zones: [{ id: ZONE_ID, plan: "Free Website" }] },
    });
  });

  it("tolerates sparse zones and unknown API fields", async () => {
    // A partial (CNAME-setup) zone without plan/name_servers, plus a field
    // this server has never seen — output validation must not reject it.
    stubCloudflare(() =>
      ok({
        id: ZONE_ID,
        name: "example.com",
        status: "pending",
        paused: false,
        type: "partial",
        original_name_servers: null,
        account: { id: "acc", name: "Acme" },
        created_on: "2026-01-01T00:00:00Z",
        modified_on: "2026-01-01T00:00:00Z",
        activated_on: null,
        tenant: { id: "t1", name: "Tenant" },
      })
    );
    const result = await client.callTool({
      name: "get_zone_details",
      arguments: { zone_id: ZONE_ID },
    });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toMatchObject({
      data: { id: ZONE_ID, plan: null },
    });
  });

  it("tolerates structured records (CAA) with null comments and extra fields", async () => {
    stubCloudflare(() =>
      ok([
        {
          id: "rec-caa",
          type: "CAA",
          name: "example.com",
          content: '0 issue "letsencrypt.org"',
          data: { flags: 0, tag: "issue", value: "letsencrypt.org" },
          proxiable: false,
          proxied: false,
          ttl: 3600,
          comment: null,
          tags: [],
          settings: {},
          meta: {},
          created_on: "2026-01-01T00:00:00Z",
          modified_on: "2026-01-01T00:00:00Z",
        },
        {
          id: "rec-mx",
          type: "MX",
          name: "example.com",
          content: "mail.example.com",
          priority: 10,
          proxiable: false,
          proxied: false,
          ttl: 1,
          comment: "primary mail",
          tags: ["team:mail"],
          meta: {},
          created_on: "2026-01-01T00:00:00Z",
          modified_on: "2026-01-01T00:00:00Z",
        },
      ])
    );
    const result = await client.callTool({
      name: "list_dns_records",
      arguments: { zone_id: ZONE_ID },
    });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toMatchObject({
      data: {
        records: [
          { id: "rec-caa", ttl: 3600, comment: null },
          { id: "rec-mx", ttl: "auto", priority: 10 },
        ],
      },
    });
  });

  it("does not attach structuredContent to error results", async () => {
    stubCloudflare(() => ({
      status: 404,
      body: {
        success: false,
        errors: [{ code: 81044, message: "Record does not exist." }],
        messages: [],
        result: null,
      },
    }));
    const result = await client.callTool({
      name: "get_dns_record",
      arguments: { zone_id: ZONE_ID, record_id: "missing" },
    });
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
    expect(textOf(result).suggestion).toMatch(/not found/i);
  });
});
