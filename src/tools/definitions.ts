/**
 * MCP Tool definitions with metadata and annotations
 */

import { DNS_RECORD_TYPES, ZONE_STATUSES } from "./schemas.js";

// Single source of truth for the record types and zone statuses the tools
// accept (mirrors the Zod schemas so the advertised JSON Schema and
// validation never drift).
const RECORD_TYPE_ENUM = [...DNS_RECORD_TYPES];
const ZONE_STATUS_ENUM = [...ZONE_STATUSES];

const TOOL_DEFINITIONS = [
  {
    name: "add_zone",
    title: "Add Zone to Cloudflare",
    description:
      "Add a new domain (zone) to your Cloudflare account. The domain's nameservers must be updated at your registrar to point to Cloudflare's nameservers after adding.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "The domain name to add (e.g., 'example.com')",
        },
        account_id: {
          type: "string",
          description:
            "Your Cloudflare account ID (found in dashboard URL or API)",
        },
        type: {
          type: "string",
          enum: ["full", "partial", "secondary", "internal"],
          description:
            "Zone type: 'full' (default) for full DNS management, 'partial' for CNAME setup, 'secondary' for secondary DNS, 'internal' for internal zones",
        },
      },
      required: ["name", "account_id"],
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: "list_zones",
    title: "List Cloudflare Zones",
    description:
      "List all domains (zones) on your Cloudflare account. Returns zone IDs, domain names, status, and nameservers.",
    inputSchema: {
      type: "object" as const,
      properties: {
        page: {
          type: "number",
          description: "Page number for pagination (default: 1)",
        },
        per_page: {
          type: "number",
          description: "Number of zones per page, 5-50 (default: 50)",
        },
        name: {
          type: "string",
          description: "Filter by domain name (partial match supported)",
        },
        status: {
          type: "string",
          enum: ZONE_STATUS_ENUM,
          description: "Filter by zone status",
        },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "get_zone_details",
    title: "Get Zone Details",
    description:
      "Get detailed information about a specific domain/zone including nameservers, plan, and settings. Provide either zone_id or domain_name.",
    inputSchema: {
      type: "object" as const,
      properties: {
        zone_id: {
          type: "string",
          description: "The zone ID (32-character hex string)",
        },
        domain_name: {
          type: "string",
          description: "The domain name (e.g., 'example.com')",
        },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "list_dns_records",
    title: "List DNS Records",
    description:
      "List all DNS records for a domain. Returns record types, names, content, TTL, and proxy status. Provide either zone_id or domain_name.",
    inputSchema: {
      type: "object" as const,
      properties: {
        zone_id: {
          type: "string",
          description: "The zone ID",
        },
        domain_name: {
          type: "string",
          description: "The domain name (alternative to zone_id)",
        },
        type: {
          type: "string",
          enum: RECORD_TYPE_ENUM,
          description: "Filter by record type",
        },
        name: {
          type: "string",
          description: "Filter by record name (e.g., 'www.example.com')",
        },
        page: {
          type: "number",
          description: "Page number (default: 1)",
        },
        per_page: {
          type: "number",
          description: "Results per page, max 100 (default: 100)",
        },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "get_dns_record",
    title: "Get DNS Record",
    description: "Get details of a specific DNS record by its ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        zone_id: {
          type: "string",
          description: "The zone ID",
        },
        record_id: {
          type: "string",
          description: "The DNS record ID",
        },
      },
      required: ["zone_id", "record_id"],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "create_dns_record",
    title: "Create DNS Record",
    description:
      "Create a new DNS record for a domain. Supports common types (A, AAAA, CNAME, TXT, MX, NS, SRV) via 'content', and structured types (CAA, HTTPS, SVCB, ...) via the 'data' object. Provide either zone_id or domain_name.",
    inputSchema: {
      type: "object" as const,
      properties: {
        zone_id: {
          type: "string",
          description: "The zone ID",
        },
        domain_name: {
          type: "string",
          description: "The domain name (alternative to zone_id)",
        },
        type: {
          type: "string",
          enum: RECORD_TYPE_ENUM,
          description: "DNS record type",
        },
        name: {
          type: "string",
          description:
            "DNS record name. Use '@' or the domain name for root, or specify subdomain (e.g., 'www', 'api')",
        },
        content: {
          type: "string",
          description:
            "Record content: IP address for A/AAAA, hostname for CNAME/MX, text for TXT. Required for simple records; omit for structured records that use 'data' (e.g. CAA).",
        },
        ttl: {
          type: "number",
          description:
            "TTL in seconds. Use 1 for automatic (default). Otherwise 60-86400 (minimum 30 for Enterprise zones).",
        },
        proxied: {
          type: "boolean",
          description:
            "Whether to proxy traffic through Cloudflare (orange cloud). Only for A, AAAA, CNAME. Default: false",
        },
        priority: {
          type: "number",
          description:
            "Priority for MX and URI records (required for those types)",
        },
        comment: {
          type: "string",
          description: "Optional comment for the record",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Optional custom tags for the record",
        },
        data: {
          type: "object",
          description:
            "Structured data for record types whose content is read-only, e.g. CAA { flags, tag, value }, SRV { service, proto, name, priority, weight, port, target }, or HTTPS/SVCB service parameters.",
        },
      },
      required: ["type", "name"],
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: "update_dns_record",
    title: "Update DNS Record",
    description:
      "Update an existing DNS record (partial update). Only specify the fields you want to change.",
    inputSchema: {
      type: "object" as const,
      properties: {
        zone_id: {
          type: "string",
          description: "The zone ID",
        },
        record_id: {
          type: "string",
          description: "The DNS record ID to update",
        },
        type: {
          type: "string",
          enum: RECORD_TYPE_ENUM,
          description: "New record type (usually not changed)",
        },
        name: {
          type: "string",
          description: "New record name",
        },
        content: {
          type: "string",
          description: "New record content",
        },
        ttl: {
          type: "number",
          description:
            "New TTL in seconds (1 for automatic, otherwise 60-86400; minimum 30 for Enterprise zones)",
        },
        proxied: {
          type: "boolean",
          description: "New proxy status",
        },
        priority: {
          type: "number",
          description: "New priority (for MX and URI records)",
        },
        comment: {
          type: "string",
          description: "New comment",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "New custom tags for the record",
        },
        data: {
          type: "object",
          description:
            "New structured data for record types like CAA/SRV/HTTPS/SVCB (see create_dns_record).",
        },
      },
      required: ["zone_id", "record_id"],
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "delete_dns_record",
    title: "Delete DNS Record",
    description:
      "Delete a DNS record. WARNING: This action is irreversible. Make sure you have the correct record_id.",
    inputSchema: {
      type: "object" as const,
      properties: {
        zone_id: {
          type: "string",
          description: "The zone ID",
        },
        record_id: {
          type: "string",
          description: "The DNS record ID to delete",
        },
      },
      required: ["zone_id", "record_id"],
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: "find_dns_records",
    title: "Find DNS Records",
    description:
      "Find DNS records by name to get their record IDs. Useful before updating or deleting records when you know the name but not the ID. Returns matching records with their IDs.",
    inputSchema: {
      type: "object" as const,
      properties: {
        zone_id: {
          type: "string",
          description: "The zone ID",
        },
        domain_name: {
          type: "string",
          description: "The domain name (alternative to zone_id)",
        },
        record_name: {
          type: "string",
          description:
            "The DNS record name to search for (e.g., 'www.example.com', 'example.com', 'api.example.com')",
        },
        type: {
          type: "string",
          enum: RECORD_TYPE_ENUM,
          description: "Optional: filter by record type",
        },
      },
      required: ["record_name"],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "backup_dns_records",
    title: "Backup DNS Records",
    description:
      "Backup DNS records to a JSON format that can be saved and used later to restore records. Can backup a single domain or ALL domains on the account. The output is a complete backup file that agents can save to disk.",
    inputSchema: {
      type: "object" as const,
      properties: {
        zone_id: {
          type: "string",
          description:
            "The zone ID to backup. If not provided (along with domain_name), backs up ALL domains.",
        },
        domain_name: {
          type: "string",
          description:
            "The domain name to backup. If not provided (along with zone_id), backs up ALL domains.",
        },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
];

// Stamp each tool's display title into annotations.title — the pre-2025-06-18
// spec's fallback location — so the two names can never drift.
export const TOOLS = TOOL_DEFINITIONS.map((tool) => ({
  ...tool,
  annotations: { title: tool.title, ...tool.annotations },
}));
