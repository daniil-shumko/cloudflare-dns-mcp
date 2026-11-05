/**
 * MCP server construction: registers every tool from the registry on an
 * McpServer. Kept separate from the stdio bootstrap so tests can connect a
 * client to it in-process.
 */

import { McpServer } from "@modelcontextprotocol/server";

import type { CloudflareClient } from "./cloudflare/client.js";
import { TOOLS } from "./tools/index.js";
import type { ToolDefinition, ToolResponse } from "./tools/index.js";
import { formatError } from "./utils/errors.js";

export const SERVER_INFO = {
  name: "cloudflare-dns",
  title: "Cloudflare DNS",
  version: __SERVER_VERSION__,
  description:
    "Manage Cloudflare zones and DNS records: list, inspect, create, update, delete, find, and back up.",
  websiteUrl: "https://github.com/daniil-shumko/cloudflare-dns-mcp",
};

/**
 * Run a tool handler, turning any thrown error (Cloudflare API errors,
 * network failures, ...) into a structured `isError` result with a code and
 * suggestion, rather than the SDK's bare error message.
 */
async function runTool(
  tool: ToolDefinition,
  cloudflare: CloudflareClient,
  input: unknown
): Promise<ToolResponse> {
  try {
    return await tool.handler(cloudflare, input);
  } catch (error) {
    return {
      content: [
        { type: "text", text: JSON.stringify(formatError(error), null, 2) },
      ],
      isError: true,
    };
  }
}

export function createServer(cloudflare: CloudflareClient): McpServer {
  const server = new McpServer(SERVER_INFO, {
    capabilities: { tools: {} },
  });

  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        ...(tool.outputSchema && { outputSchema: tool.outputSchema }),
        annotations: tool.annotations,
      },
      (input: unknown) => runTool(tool, cloudflare, input)
    );
  }

  return server;
}
