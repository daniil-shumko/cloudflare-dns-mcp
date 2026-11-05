#!/usr/bin/env node

/**
 * Cloudflare DNS MCP Server
 *
 * A Model Context Protocol server for managing Cloudflare DNS records.
 * Communicates over stdio for Claude Desktop and Claude Code.
 */

import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { CloudflareClient } from "./cloudflare/client.js";
import { createServer } from "./server.js";
import { TOOLS } from "./tools/index.js";
import { loadConfig } from "./utils/config.js";

function main() {
  const config = loadConfig();
  const cloudflare = new CloudflareClient(config.apiToken);

  // serveStdio negotiates the protocol era per connection, so the same server
  // serves both 2025-era clients (initialize handshake) and 2026-07-28+
  // clients (server/discover).
  serveStdio(() => createServer(cloudflare));

  // All logging must go to stderr — stdout is reserved for the MCP protocol.
  console.error("Cloudflare DNS MCP Server started (stdio)");
  console.error("Tools available: " + TOOLS.map((t) => t.name).join(", "));
}

try {
  main();
} catch (error) {
  console.error("Fatal error:", error);
  process.exit(1);
}
