#!/usr/bin/env node

/**
 * Cloudflare DNS MCP Server
 *
 * A Model Context Protocol server for managing Cloudflare DNS records.
 * Connects via stdio transport for use with Claude Desktop and Claude Code.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { CloudflareClient, CloudflareAPIError } from "./cloudflare/client.js";
import { loadConfig } from "./utils/config.js";
import { formatError } from "./utils/errors.js";
import { TOOLS, handleToolCall } from "./tools/index.js";

async function main() {
  // Load configuration
  const config = loadConfig();

  // Initialize Cloudflare client
  const cloudflare = new CloudflareClient(config.apiToken);

  // Create MCP server
  const server = new Server(
    {
      name: "cloudflare-dns",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      return await handleToolCall(cloudflare, name, args);
    } catch (error) {
      // Handle validation errors
      if (error instanceof z.ZodError) {
        const validationError = {
          error: true,
          code: "VALIDATION_ERROR",
          message: "Invalid input parameters",
          details: error.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join("; "),
        };
        return {
          content: [
            { type: "text", text: JSON.stringify(validationError, null, 2) },
          ],
          isError: true,
        };
      }

      // Handle Cloudflare API errors
      if (error instanceof CloudflareAPIError) {
        return {
          content: [
            { type: "text", text: JSON.stringify(formatError(error), null, 2) },
          ],
          isError: true,
        };
      }

      // Handle other errors
      return {
        content: [
          { type: "text", text: JSON.stringify(formatError(error), null, 2) },
        ],
        isError: true,
      };
    }
  });

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is reserved for MCP protocol)
  console.error("Cloudflare DNS MCP Server started");
  console.error("Tools available: " + TOOLS.map((t) => t.name).join(", "));
}

// Run the server
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
