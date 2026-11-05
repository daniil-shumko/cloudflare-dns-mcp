/**
 * End-to-end test of the real stdio entry point: builds src/index.ts, spawns
 * it, and connects with the SDK client in both protocol eras. Only calls that
 * need no network are made (tool listing, input validation).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { build } from "tsup";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const root = fileURLToPath(new URL("..", import.meta.url));
// Built inside the repo so the bundle resolves its runtime deps from node_modules.
const outDir = fileURLToPath(
  new URL("../node_modules/.cache/cloudflare-dns-mcp-e2e", import.meta.url)
);
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  version: string;
};

beforeAll(async () => {
  await build({
    config: false,
    entry: { index: `${root}src/index.ts` },
    format: ["esm"],
    outDir,
    clean: true,
    silent: true,
    define: { __SERVER_VERSION__: JSON.stringify(pkg.version) },
  });
}, 60_000);

let client: Client | undefined;

afterEach(async () => {
  await client?.close();
  client = undefined;
});

async function connect(options?: ConstructorParameters<typeof Client>[1]) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [`${outDir}/index.js`],
    env: { CLOUDFLARE_API_TOKEN: "e2e-dummy-token" },
    stderr: "ignore",
  });
  client = new Client({ name: "e2e", version: "0.0.0" }, options);
  await client.connect(transport);
  return client;
}

describe.each([
  { era: "2025-11-25 (initialize)", options: undefined, version: "2025-11-25" },
  {
    era: "2026-07-28 (server/discover)",
    options: { versionNegotiation: { mode: { pin: "2026-07-28" as const } } },
    version: "2026-07-28",
  },
])("stdio server, $era client", ({ options, version }) => {
  it("negotiates the protocol version and lists all tools", async () => {
    const c = await connect(options);
    expect(c.getNegotiatedProtocolVersion()).toBe(version);
    expect(c.getServerVersion()?.version).toBe(pkg.version);
    const { tools } = await c.listTools();
    expect(tools).toHaveLength(10);
  });

  it("returns input validation failures as tool errors", async () => {
    const c = await connect(options);
    const result = await c.callTool({ name: "get_dns_record", arguments: {} });
    expect(result.isError).toBe(true);
  });
});
