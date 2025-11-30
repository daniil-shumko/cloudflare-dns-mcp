#!/usr/bin/env node

/**
 * Cloudflare DNS MCP Server
 *
 * A Model Context Protocol server for managing Cloudflare DNS records.
 * Supports both stdio transport (for Claude Desktop/Code) and HTTP transport (for Smithery).
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import express, { Request, Response } from "express";

import { CloudflareClient, CloudflareAPIError } from "./cloudflare/client.js";
import { loadConfig } from "./utils/config.js";
import { formatError } from "./utils/errors.js";
import { TOOLS, handleToolCall } from "./tools/index.js";

function createServer(cloudflare: CloudflareClient): Server {
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

  return server;
}

async function runStdioTransport(cloudflare: CloudflareClient) {
  const server = createServer(cloudflare);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Cloudflare DNS MCP Server started (stdio)");
  console.error("Tools available: " + TOOLS.map((t) => t.name).join(", "));
}

async function runHttpTransport(cloudflare: CloudflareClient) {
  const app = express();
  app.use(express.json());

  // Store transports by session ID for proper cleanup
  const transports = new Map<string, StreamableHTTPServerTransport>();

  // MCP endpoint
  app.all("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports.has(sessionId)) {
      transport = transports.get(sessionId)!;
    } else {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
      });
      const server = createServer(cloudflare);
      await server.connect(transport);

      // Store transport if it has a session ID
      transport.onclose = () => {
        if (sessionId) {
          transports.delete(sessionId);
        }
      };
    }

    await transport.handleRequest(req, res, req.body);
  });

  // Health check endpoint
  app.get("/", (_req: Request, res: Response) => {
    res.send("Cloudflare DNS MCP Server is running!");
  });

  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`Cloudflare DNS MCP Server running on port ${PORT} (HTTP)`);
    console.log("Tools available: " + TOOLS.map((t) => t.name).join(", "));
  });
}

async function main() {
  // Load configuration
  const config = loadConfig();

  // Initialize Cloudflare client
  const cloudflare = new CloudflareClient(config.apiToken);

  // Check transport mode
  const useHttp = process.env.MCP_TRANSPORT === "http" || process.env.PORT;

  if (useHttp) {
    await runHttpTransport(cloudflare);
  } else {
    await runStdioTransport(cloudflare);
  }
}

// Run the server
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
