# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server for managing Cloudflare DNS records. It exposes 10 tools for domain management via Claude Desktop and Claude Code.

## Commands

```bash
npm run build      # Build with tsup (outputs to dist/)
npm run dev        # Watch mode for development
npm run typecheck  # TypeScript type checking only
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
├── index.ts              # MCP server: tool definitions, schemas, request handlers
├── cloudflare/
│   ├── client.ts         # CloudflareClient class - all API communication
│   └── types.ts          # TypeScript types for Cloudflare API v4
└── utils/
    ├── config.ts         # Configuration from CLOUDFLARE_API_TOKEN env var
    └── errors.ts         # Error formatting with helpful suggestions
```

### Key Patterns

**Tool Implementation Flow (in `index.ts`):**
1. Zod schemas validate tool inputs (e.g., `CreateDNSRecordSchema`)
2. `TOOLS` array defines MCP tool metadata with annotations (`readOnlyHint`, `destructiveHint`)
3. Switch statement in `CallToolRequestSchema` handler routes to tool logic
4. `CloudflareClient` executes API calls
5. `formatSuccess`/`formatError` standardize output

**Zone Resolution:** Tools accepting `zone_id` or `domain_name` use `CloudflareClient.resolveZoneId()` which auto-detects 32-char hex IDs vs domain names.

**Destructive Tool Annotations:** `add_zone`, `update_dns_record`, `delete_dns_record` have `destructiveHint: true` requiring session-scoped approval.

### Server Communication

- Uses `StdioServerTransport` for MCP protocol over stdin/stdout
- All logging goes to stderr (stdout reserved for protocol)
- Returns JSON with `success`/`error` and `data`/`details` fields

## Configuration

Requires `CLOUDFLARE_API_TOKEN` environment variable with:
- Zone.Zone: Read (listing/viewing domains)
- Zone.DNS: Edit (DNS record CRUD)
- Zone.Zone: Edit (only for `add_zone` tool)
