# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server for managing Cloudflare DNS records. It exposes 10 tools for domain management via Claude Desktop and Claude Code.

## Commands

```bash
npm run build      # Build with tsup (outputs to dist/)
npm run dev        # Watch mode for development
npm run typecheck  # TypeScript type checking only
npm test           # Run the vitest test suite
npm run start      # Run the built server
```

**Manual testing:**
```bash
export CLOUDFLARE_API_TOKEN="your_token"
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js
```

## Architecture

```
src/
├── index.ts              # stdio bootstrap: serveStdio(() => createServer(...))
├── server.ts             # createServer(): McpServer + registers every tool in TOOLS
├── globals.d.ts          # Declares __SERVER_VERSION__ (injected at build time)
├── cloudflare/
│   ├── client.ts         # CloudflareClient class - all API communication
│   └── types.ts          # TypeScript types for Cloudflare API v4
├── tools/
│   ├── index.ts          # Tools module barrel exports
│   ├── schemas.ts        # Zod input schemas (with .describe() docs) + DNS_RECORD_TYPES
│   ├── definitions.ts    # TOOLS registry: name/title/description/annotations,
│   │                     #   input schema and handler per tool
│   ├── outputs.ts        # Lenient output schemas for read tools' structuredContent
│   ├── handlers.ts       # Tool handler implementations (receive validated input)
│   └── types.ts          # Tool-specific types (backup structures, limits)
└── utils/
    ├── config.ts         # Configuration from CLOUDFLARE_API_TOKEN env var
    └── errors.ts         # Error formatting with helpful suggestions
```

### Key Patterns

**SDK:** MCP TypeScript SDK v2 (`@modelcontextprotocol/server`) with the high-level `McpServer`. `serveStdio` negotiates the protocol era per connection, so both 2025-era clients (`initialize`) and 2026-07-28+ clients (`server/discover`) are served by the same code.

**Tool Implementation Flow:**
1. `src/tools/schemas.ts` — Zod schemas are the single source of truth for tool inputs: the SDK validates arguments against them (applying defaults; `.refine()` failures come back as `isError` results) and publishes their JSON Schema in `tools/list`. Field descriptions live here via `.describe()` — there is no hand-written JSON Schema.
2. `src/tools/definitions.ts` — the `TOOLS` registry pairs each schema with its metadata, annotations (`readOnlyHint`, `destructiveHint`, ...) and handler; `defineTool` stamps `title` into `annotations.title` and ties the handler's input type to its schema
3. `src/server.ts` — `createServer` registers every tool on an `McpServer`, wrapping handlers so thrown errors become structured `formatError` JSON
4. `src/tools/handlers.ts` — handlers receive already-validated input; `CloudflareClient` executes API calls
5. `formatSuccess`/`formatError` standardize output

**Tests:** `tests/server.test.ts` drives `createServer` through a real SDK client over an in-memory transport (fetch stubbed); `tests/stdio.e2e.test.ts` builds and spawns the actual binary and connects in both protocol eras.

**Server version:** `tsup.config.ts` injects `package.json`'s version as the `__SERVER_VERSION__` global so the version reported to MCP clients can never drift from the published package.

**Zone Resolution:** Tools accepting `zone_id` or `domain_name` use `CloudflareClient.resolveZoneId()` which auto-detects 32-char hex IDs vs domain names.

**Destructive Tool Annotations:** `add_zone`, `update_dns_record`, `delete_dns_record` have `destructiveHint: true` requiring session-scoped approval.

### Server Communication

- Uses `serveStdio` for MCP over stdin/stdout (stdio only — no HTTP transport)
- All logging goes to stderr (stdout reserved for protocol)
- Returns JSON with `success`/`error` and `data`/`details` fields

## Configuration

Requires `CLOUDFLARE_API_TOKEN` environment variable with:
- Zone.Zone: Read (listing/viewing domains)
- Zone.DNS: Edit (DNS record CRUD)
- Zone.Zone: Edit (only for `add_zone` tool)
