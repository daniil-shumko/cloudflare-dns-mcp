# Cloudflare DNS MCP Server

> **Note:** This is an unofficial MCP server and is not affiliated with or endorsed by Cloudflare.

[![npm version](https://img.shields.io/npm/v/cloudflare-dns-mcp.svg)](https://www.npmjs.com/package/cloudflare-dns-mcp)
[![Tests](https://github.com/daniil-shumko/cloudflare-dns-mcp/actions/workflows/test.yml/badge.svg)](https://github.com/daniil-shumko/cloudflare-dns-mcp/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)

> ⚠️ **Security Warning**
>
> This MCP server was heavily "vibe coded" and should be used with caution. Before using:
>
> - **Review the code** - This tool has access to your Cloudflare account via API token
> - **Clone the repository** - For security, clone this repo and run a local copy rather than using npx
> - **Use minimal permissions** - Create an API token with only the permissions you need
> - **Audit before use** - The code is simple enough to review in ~30 minutes
> - **Backup DNS first** - Use the `backup_dns_records` tool to export your DNS settings before making any modifications
>
> ```bash
> git clone https://github.com/daniil-shumko/cloudflare-dns-mcp
> cd cloudflare-dns-mcp && npm install && npm run build
> ```

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for managing Cloudflare DNS records. Use natural language with Claude Desktop or Claude Code to list domains, view DNS records, and make DNS changes.

## What is MCP?

The Model Context Protocol (MCP) is an open standard that allows AI assistants like Claude to securely connect to external tools and data sources. This server implements MCP to give Claude the ability to interact with your Cloudflare DNS settings.

## Features

- **List and search domains** - View all zones on your Cloudflare account
- **Full DNS management** - Create, read, update, and delete DNS records
- **Backup & export** - Export DNS records to JSON for backup or migration
- **Wide record-type support** - Common types (A, AAAA, CNAME, TXT, MX, NS, SRV) via `content`, plus structured types (CAA, HTTPS, SVCB, TLSA, SSHFP, URI, …) via the `data` field
- **Flexible identification** - Use either zone IDs or domain names
- **Cloudflare proxy support** - Toggle orange cloud (proxy) status on records

## Quick Start

Requires **Node.js 22 or higher** (version 2.0 dropped Node 20, which reached end-of-life in April 2026).

### 1. Install

**Option A: Install from npm (recommended)**
```bash
npm install -g cloudflare-dns-mcp
```

**Option B: Clone and build locally (for code review)**
```bash
git clone https://github.com/daniil-shumko/cloudflare-dns-mcp.git
cd cloudflare-dns-mcp
npm install
npm run build
```

### 2. Create Cloudflare API Token

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **"Create Token"**
3. Use the **"Edit zone DNS"** template
4. Copy the generated token

### 3. Configure Claude Desktop

Add to your Claude Desktop config:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**If installed via npm (Option A):**
```json
{
  "mcpServers": {
    "cloudflare-dns": {
      "command": "npx",
      "args": ["cloudflare-dns-mcp"],
      "env": {
        "CLOUDFLARE_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

**If installed locally (Option B):**
```json
{
  "mcpServers": {
    "cloudflare-dns": {
      "command": "node",
      "args": ["/absolute/path/to/cloudflare-dns-mcp/dist/index.js"],
      "env": {
        "CLOUDFLARE_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

### 4. Restart Claude Desktop

The server will now be available. Try asking Claude:
> "List all my Cloudflare domains"

### Updating

- **npx:** `npx` can keep running a cached older version. Use `"args": ["cloudflare-dns-mcp@latest"]` to always get the newest release, or pin a major version (`"cloudflare-dns-mcp@2"`) to control upgrades.
- **Global install:** `npm update -g cloudflare-dns-mcp`
- **Local clone:** `git pull && npm install && npm run build`

Restart Claude after updating.

**Upgrading from 1.x to 2.0:** no configuration changes are needed. 2.0 requires Node.js 22+, supports both current MCP clients and the 2026-07-28 protocol revision, and adds `structuredContent` to the read tools. One visible change: invalid tool arguments now return the MCP SDK's plain-text message (`Input validation error: ...`) instead of a `VALIDATION_ERROR` JSON object; errors from the Cloudflare API keep their JSON format with `code` and `suggestion`.

---

## Available Tools

This MCP server provides 10 tools for DNS management:

| Tool | Description |
|------|-------------|
| `add_zone` | Add a new domain to your Cloudflare account |
| `list_zones` | List all domains on your account |
| `get_zone_details` | Get detailed info about a domain |
| `list_dns_records` | List DNS records for a domain |
| `get_dns_record` | Get a specific record by ID |
| `find_dns_records` | Search records by name |
| `create_dns_record` | Create a new DNS record |
| `update_dns_record` | Modify an existing record |
| `delete_dns_record` | Remove a DNS record |
| `backup_dns_records` | Export records to JSON |

Every tool returns its result as JSON text. The read tools (`list_zones`, `get_zone_details`, `list_dns_records`, `get_dns_record`, `find_dns_records`) also declare an [output schema](https://modelcontextprotocol.io/specification/2025-11-25/server/tools#output-schema) and return the same data as `structuredContent`, so clients can consume it without parsing text.

---

## Tool Reference

### `add_zone`

Add a new domain (zone) to your Cloudflare account. The domain's nameservers must be updated at your registrar to point to Cloudflare's nameservers after adding.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | The domain name to add (e.g., `example.com`) |
| `account_id` | string | Yes | Your Cloudflare account ID (found in dashboard URL or API) |
| `type` | string | No | Zone type: `full` (default), `partial`, `secondary`, or `internal` |

**Finding your Account ID:**
- In Cloudflare Dashboard URL: `https://dash.cloudflare.com/<ACCOUNT_ID>/...`
- Via API: Use `list_zones` and check the `account.id` field in zone details

**Example prompts:**
- "Add example.com to my Cloudflare account"
- "Create a new zone for mydomain.io with account ID abc123"

**Response includes:**
- Zone ID for future operations
- Assigned nameservers to configure at your registrar
- Zone status (typically `pending` until nameservers are updated)

> ⚠️ **Permission Note:** This tool requires confirmation before each use and cannot be permanently auto-approved. This is a security measure as adding zones affects your Cloudflare account configuration.

---

### `list_zones`

List all domains (zones) on your Cloudflare account.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |
| `per_page` | number | No | Results per page, 5-50 (default: 50) |
| `name` | string | No | Filter by domain name (partial match) |
| `status` | string | No | Filter by status: `active`, `pending`, `initializing`, `moved` |

**Example prompts:**
- "List all my domains"
- "Show me my active Cloudflare zones"
- "Find domains containing 'example'"

---

### `get_zone_details`

Get detailed information about a specific domain including nameservers, plan, and settings.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `zone_id` | string | No* | The zone ID (32-character hex string) |
| `domain_name` | string | No* | The domain name (e.g., `example.com`) |

*One of `zone_id` or `domain_name` is required.

**Example prompts:**
- "Show me details for example.com"
- "What nameservers is mysite.com using?"
- "What plan is example.com on?"

---

### `list_dns_records`

List all DNS records for a domain.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `zone_id` | string | No* | The zone ID |
| `domain_name` | string | No* | The domain name |
| `type` | string | No | Filter by record type: `A`, `AAAA`, `CNAME`, `TXT`, `MX`, `NS`, `SRV`, `CAA`, `PTR`, `HTTPS`, `SVCB`, and other standard types |
| `name` | string | No | Filter by record name |
| `page` | number | No | Page number (default: 1) |
| `per_page` | number | No | Results per page, max 100 (default: 100) |

*One of `zone_id` or `domain_name` is required.

**Example prompts:**
- "What DNS records does example.com have?"
- "Show me all A records for mysite.com"
- "List the MX records for my email domain"

---

### `get_dns_record`

Get details of a specific DNS record by its ID.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `zone_id` | string | Yes | The zone ID |
| `record_id` | string | Yes | The DNS record ID |

---

### `find_dns_records`

Search for DNS records by name. Useful for finding record IDs before updating or deleting.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `zone_id` | string | No* | The zone ID |
| `domain_name` | string | No* | The domain name |
| `record_name` | string | Yes | The record name to search for (e.g., `www.example.com`) |
| `type` | string | No | Filter by record type |

*One of `zone_id` or `domain_name` is required.

**Example prompts:**
- "Find the record ID for www.example.com"
- "Look up the A record for api.example.com"
- "What's the record ID for mail.example.com?"

---

### `create_dns_record`

Create a new DNS record.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `zone_id` | string | No* | The zone ID |
| `domain_name` | string | No* | The domain name |
| `type` | string | Yes | Record type: `A`, `AAAA`, `CNAME`, `TXT`, `MX`, `NS`, `SRV`, `CAA`, `HTTPS`, `SVCB`, `TLSA`, `SSHFP`, `URI`, and other standard types |
| `name` | string | Yes | Record name (use `@` or domain for root) |
| `content` | string | No** | Record content (IP, hostname, or text) for simple records |
| `data` | object | No** | Structured data for records whose content is read-only, e.g. CAA `{ flags, tag, value }`, SRV `{ priority, weight, port, target }` (service and protocol go in `name`, e.g. `_sip._tcp`), or HTTPS/SVCB params |
| `ttl` | number | No | TTL in seconds: `1` = automatic (default), otherwise `60`–`86400` (minimum `30` on Enterprise zones) |
| `proxied` | boolean | No | Enable Cloudflare proxy (default: false) |
| `priority` | number | No | Priority for MX and URI records |
| `comment` | string | No | Optional comment |
| `tags` | string[] | No | Optional custom tags |

*One of `zone_id` or `domain_name` is required.
**One of `content` (simple records) or `data` (structured records like CAA) is required.

**Example prompts:**
- "Add an A record for www.example.com pointing to 192.168.1.1"
- "Create a CNAME for blog.example.com pointing to myblog.netlify.app"
- "Add a TXT record for _dmarc.example.com with value 'v=DMARC1; p=none'"
- "Set up an MX record for example.com with priority 10 pointing to mail.example.com"
- "Add an A record for api.example.com with Cloudflare proxy enabled"

---

### `update_dns_record`

Update an existing DNS record. Only specify the fields you want to change.

> **Changing the record type** replaces the record. Cloudflare no longer allows in-place type changes (end-of-life 2026-06-30), so the server deletes the old record and creates the new one in a single atomic [batch](https://developers.cloudflare.com/dns/manage-dns-records/how-to/batch-record-changes/) request. The new record gets a **new ID** (the response includes `replaced_record_id`), new `content` (or `data`) is required, and name, TTL, comment and tags carry over unless you set them.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `zone_id` | string | Yes | The zone ID |
| `record_id` | string | Yes | The DNS record ID to update |
| `type` | string | No | New record type (replaces the record; see note above) |
| `name` | string | No | New record name |
| `content` | string | No | New content |
| `ttl` | number | No | New TTL (`1` = automatic, otherwise `60`–`86400`; minimum `30` on Enterprise zones) |
| `proxied` | boolean | No | New proxy status |
| `priority` | number | No | New priority (for MX and URI records) |
| `comment` | string | No | New comment |
| `tags` | string[] | No | New custom tags |
| `data` | object | No | New structured data (CAA/SRV/HTTPS/SVCB) |

**Example prompts:**
- "Change the IP for www.example.com to 10.0.0.1"
- "Change the priority of the MX record to 20"
- "Enable Cloudflare proxy for the www record on example.com"
- "Update the TTL for api.example.com to 300 seconds"

---

### `delete_dns_record`

Delete a DNS record. **This action is irreversible.**

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `zone_id` | string | Yes | The zone ID |
| `record_id` | string | Yes | The DNS record ID to delete |

**Example prompts:**
- "Delete the old CNAME record for legacy.example.com"
- "Remove the TXT verification record from example.com"

---

### `backup_dns_records`

Backup DNS records to JSON format. Can backup a single domain or all domains on the account.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `zone_id` | string | No | Zone ID to backup (omit for all domains) |
| `domain_name` | string | No | Domain to backup (omit for all domains) |

If neither parameter is provided, **all domains** will be backed up.

Each backed-up record includes its `type`, `name`, `content`, `ttl`, `proxied`, and (when set) `priority` and `comment`. Record types the tools can't recreate (such as a system-managed SOA) are skipped.

> **Limitation:** backups do not include the structured `data` field or `tags`. Records whose content is set through `data` (CAA, SRV, HTTPS, SVCB, TLSA, …) therefore can't be recreated from a backup as-is, and restored records lose their tags. Simple records (A, AAAA, CNAME, TXT, MX, NS, …) restore fully.

**Example prompts:**
- "Backup all DNS records for example.com"
- "Create a backup of all my domains' DNS records"
- "Export DNS settings for mysite.com and save to dns-backup.json"

**Backup JSON format:**
```json
{
  "version": "1.0",
  "created_at": "2024-01-15T10:30:00.000Z",
  "backup_type": "single_zone",
  "zones": [
    {
      "zone_id": "abc123def456...",
      "zone_name": "example.com",
      "records": [
        {
          "type": "A",
          "name": "example.com",
          "content": "192.168.1.1",
          "ttl": 1,
          "proxied": true
        },
        {
          "type": "CNAME",
          "name": "www.example.com",
          "content": "example.com",
          "ttl": 1,
          "proxied": true
        },
        {
          "type": "MX",
          "name": "example.com",
          "content": "mail.example.com",
          "ttl": 3600,
          "proxied": false,
          "priority": 10
        }
      ],
      "record_count": 3
    }
  ],
  "total_zones": 1,
  "total_records": 3
}
```

### Restoring from Backup

The backup format is designed to work with the `create_dns_record` tool. To restore:

1. Load the backup JSON file
2. For each record in each zone, use `create_dns_record` with the record data
3. The `zone_name` field identifies which domain to restore to

Example restore prompt:
> "Read the backup file dns-backup.json and recreate all the DNS records for example.com"

---

## Configuration

### Claude Desktop

**Config file locations:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**Using npx (recommended):**
```json
{
  "mcpServers": {
    "cloudflare-dns": {
      "command": "npx",
      "args": ["cloudflare-dns-mcp"],
      "env": {
        "CLOUDFLARE_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

**Using local installation:**
```json
{
  "mcpServers": {
    "cloudflare-dns": {
      "command": "node",
      "args": ["/absolute/path/to/cloudflare-dns-mcp/dist/index.js"],
      "env": {
        "CLOUDFLARE_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

### Claude Code

**Using npx (recommended):**

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "cloudflare-dns": {
      "command": "npx",
      "args": ["cloudflare-dns-mcp"],
      "env": {
        "CLOUDFLARE_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

Or use the CLI:
```bash
claude mcp add cloudflare-dns --env CLOUDFLARE_API_TOKEN=your_token_here -- npx cloudflare-dns-mcp
```

**Using local installation:**

```json
{
  "mcpServers": {
    "cloudflare-dns": {
      "command": "node",
      "args": ["/absolute/path/to/cloudflare-dns-mcp/dist/index.js"],
      "env": {
        "CLOUDFLARE_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CLOUDFLARE_API_TOKEN` | Yes | Your Cloudflare API token |

### Creating a Cloudflare API Token

1. Go to [Cloudflare Dashboard > API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **"Create Token"**
3. Choose one of:
   - **"Edit zone DNS" template** - Pre-configured for DNS management (read/edit records)
   - **Custom token** with these permissions:
     - `Zone.Zone` → Read (required for listing and viewing zones)
     - `Zone.DNS` → Edit (required for DNS record management)
     - `Zone.Zone` → Edit (required only for `add_zone` tool)
4. (Optional) Restrict to specific zones for better security
5. Copy the generated token

For read-only use (listing, viewing, finding and backing up records), `Zone.DNS → Read` is enough instead of `Edit`.

Both user API tokens and account-owned API tokens (prefixed `cfat_`) work. If a token is restricted to specific zones, it may still *list* other zones (when it has account-wide `Zone.Zone → Read`), but DNS calls on zones outside its scope fail; see [Authentication or permission errors](#authentication-or-permission-errors).

> **Note:** If you only need to manage DNS records for existing domains, you don't need `Zone.Zone → Edit`. Add this permission only if you want to use the `add_zone` tool to add new domains.

---

## Development

### Prerequisites

- Node.js 22 or higher
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/daniil-shumko/cloudflare-dns-mcp.git
cd cloudflare-dns-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

### Available Scripts

```bash
npm run build         # Build for production
npm run dev           # Watch mode (rebuild on changes)
npm run typecheck     # Run TypeScript type checking
npm run test          # Run test suite
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run start         # Run the built server
```

### Project Structure

```
cloudflare-dns-mcp/
├── src/
│   ├── index.ts              # stdio entry point
│   ├── server.ts             # McpServer setup and tool registration
│   ├── globals.d.ts          # Build-time globals (__SERVER_VERSION__)
│   ├── cloudflare/
│   │   ├── client.ts         # Cloudflare API client
│   │   └── types.ts          # TypeScript type definitions
│   ├── tools/
│   │   ├── index.ts          # Tools module exports
│   │   ├── schemas.ts        # Zod input schemas (source of the published JSON Schema)
│   │   ├── definitions.ts    # Tool registry: metadata, annotations, handlers
│   │   ├── outputs.ts        # Output schemas for the read tools' structuredContent
│   │   ├── handlers.ts       # Tool implementations
│   │   └── types.ts          # Tool-specific types
│   └── utils/
│       ├── config.ts         # Configuration loader
│       └── errors.ts         # Error handling utilities
├── tests/                    # Unit, protocol (in-memory client) and stdio e2e tests
├── dist/                     # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
├── tsup.config.ts            # Build config (injects the package version)
├── vitest.config.ts
└── README.md
```

### Testing

Run the test suite:

```bash
npm test
```

The suite has three layers: unit tests for schemas, handlers, the API client and error formatting; protocol tests (`tests/server.test.ts`) that drive the server with a real MCP client over an in-memory transport, with the Cloudflare API stubbed; and an end-to-end test (`tests/stdio.e2e.test.ts`) that builds and spawns the server and connects over stdio with both 2025-11-25 and 2026-07-28 clients. No test calls the real Cloudflare API.

Test the server manually:

```bash
# Set your API token
export CLOUDFLARE_API_TOKEN="your_token_here"

# Test server startup
node dist/index.js

# Test with JSON-RPC (list tools)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js
```

---

## Troubleshooting

### "CLOUDFLARE_API_TOKEN environment variable is required"

The API token is not set. Make sure you've added it to your MCP configuration's `env` block.

### "Zone not found"

- The domain might not exist in your Cloudflare account
- Your API token might not have access to this zone
- Check for typos in the domain name

### Authentication or permission errors

The error's `code` tells the two cases apart:

- **Token is valid but lacks permission** (`CF_10000` "Authentication error" with HTTP 403, or `CF_6111`): the token isn't permitted for that zone or action. This is common with tokens restricted to specific zones — they can list zones they can't read DNS for. Check the token's zone resources and that it has `Zone.DNS` (Read, or Edit for changes) and `Zone.Zone: Read`; `add_zone` also needs `Zone.Zone: Edit`. The error includes a `documentation_url` for the API endpoint that was denied.
- **Token is invalid, expired or malformed** (`CF_9109` "Invalid access token", `CF_10000` with HTTP 401, or `CF_6003` / `CF_9106`): check that `CLOUDFLARE_API_TOKEN` is copied correctly and still active.

The `suggestion` field in the error response states which case applies.

### Server not appearing in Claude Desktop

1. Verify the path to `dist/index.js` is absolute (not relative)
2. Restart Claude Desktop after changing the config
3. Check that the build completed successfully (`npm run build`)
4. Check Claude Desktop logs for errors

### Rate limiting

The Cloudflare API allows 1,200 requests per 5 minutes per token. When a request is rate limited, the error's `suggestion` includes how long to wait (from Cloudflare's `retry-after` header).

---

## Security Best Practices

- **Never commit your API token** to version control
- **Use environment variables** for token storage
- **Create minimal-permission tokens** - only grant Zone.Zone:Read and Zone.DNS:Edit
- **Scope tokens to specific zones** if you only need to manage certain domains
- **Rotate tokens periodically** for better security
- **Review audit logs** in Cloudflare dashboard for API activity

### Tool Permission Levels

This MCP server uses [MCP Tool Annotations](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) to indicate tool behavior and permission requirements:

| Tool | Read-Only | Destructive | Behavior |
|------|-----------|-------------|----------|
| `list_zones` | ✅ | - | Safe to auto-approve |
| `get_zone_details` | ✅ | - | Safe to auto-approve |
| `list_dns_records` | ✅ | - | Safe to auto-approve |
| `get_dns_record` | ✅ | - | Safe to auto-approve |
| `find_dns_records` | ✅ | - | Safe to auto-approve |
| `backup_dns_records` | ✅ | - | Safe to auto-approve |
| `create_dns_record` | - | - | Can be auto-approved (additive only) |
| `update_dns_record` | - | ⚠️ | **Session-only approval** (can break DNS) |
| `delete_dns_record` | - | ⚠️ | **Session-only approval** (irreversible) |
| `add_zone` | - | ⚠️ | **Session-only approval** (account-level change) |

**Tools marked with `destructiveHint: true`** (update, delete, add_zone):
- Require confirmation before each use
- Cannot be permanently auto-approved across sessions
- Must be re-approved in new Claude Code sessions

**Why these tools require extra confirmation:**
- `add_zone` - Modifies account configuration, may have billing implications
- `update_dns_record` - Can misconfigure critical DNS settings (email, website)
- `delete_dns_record` - Irreversible action that can break services

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Add TypeScript types for new features
- Tool input schemas and the parameter descriptions clients see live in `src/tools/schemas.ts` (Zod `.describe()`); there is no separate JSON Schema to edit
- Update README for new tools or parameters
- Test changes with both Claude Desktop and Claude Code

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [Anthropic](https://anthropic.com) for Claude and the Model Context Protocol
- [Cloudflare](https://cloudflare.com) for their excellent API

---

## Related Projects

- [Model Context Protocol](https://modelcontextprotocol.io) - The MCP specification
- [MCP Servers](https://github.com/modelcontextprotocol/servers) - Official MCP server implementations
- [Cloudflare API Docs](https://developers.cloudflare.com/api/) - Cloudflare API documentation
