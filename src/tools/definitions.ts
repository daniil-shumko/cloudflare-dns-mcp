/**
 * MCP Tool definitions with metadata and annotations
 */

export const TOOLS = [
  {
    name: "add_zone",
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
          enum: ["full", "partial", "secondary"],
          description:
            "Zone type: 'full' (default) for full DNS management, 'partial' for CNAME setup, 'secondary' for secondary DNS",
        },
        jump_start: {
          type: "boolean",
          description:
            "Automatically fetch existing DNS records (default: false)",
        },
      },
      required: ["name", "account_id"],
    },
    annotations: {
      title: "Add Zone to Cloudflare",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: "list_zones",
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
          description: "Number of zones per page, max 50 (default: 50)",
        },
        name: {
          type: "string",
          description: "Filter by domain name (partial match supported)",
        },
        status: {
          type: "string",
          enum: [
            "active",
            "pending",
            "initializing",
            "moved",
            "deleted",
            "deactivated",
          ],
          description: "Filter by zone status",
        },
      },
    },
    annotations: {
      title: "List Cloudflare Zones",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "get_zone_details",
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
      title: "Get Zone Details",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "list_dns_records",
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
          enum: ["A", "AAAA", "CNAME", "TXT", "MX", "NS", "SRV", "CAA", "PTR"],
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
      title: "List DNS Records",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "get_dns_record",
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
      title: "Get DNS Record",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "create_dns_record",
    description:
      "Create a new DNS record for a domain. Supports A, AAAA, CNAME, TXT, MX, NS, SRV, and CAA record types. Provide either zone_id or domain_name.",
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
          enum: ["A", "AAAA", "CNAME", "TXT", "MX", "NS", "SRV", "CAA"],
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
            "Record content: IP address for A/AAAA, hostname for CNAME/MX, text for TXT",
        },
        ttl: {
          type: "number",
          description:
            "TTL in seconds. Use 1 for automatic (default). Range: 60-86400",
        },
        proxied: {
          type: "boolean",
          description:
            "Whether to proxy traffic through Cloudflare (orange cloud). Only for A, AAAA, CNAME. Default: false",
        },
        priority: {
          type: "number",
          description: "Priority for MX records (required for MX type)",
        },
        comment: {
          type: "string",
          description: "Optional comment for the record",
        },
      },
      required: ["type", "name", "content"],
    },
    annotations: {
      title: "Create DNS Record",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: "update_dns_record",
    description:
      "Update an existing DNS record. Only specify the fields you want to change.",
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
          enum: ["A", "AAAA", "CNAME", "TXT", "MX", "NS", "SRV", "CAA"],
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
          description: "New TTL in seconds",
        },
        proxied: {
          type: "boolean",
          description: "New proxy status",
        },
        comment: {
          type: "string",
          description: "New comment",
        },
      },
      required: ["zone_id", "record_id"],
    },
    annotations: {
      title: "Update DNS Record",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "delete_dns_record",
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
      title: "Delete DNS Record",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: "find_dns_records",
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
          enum: ["A", "AAAA", "CNAME", "TXT", "MX", "NS", "SRV", "CAA", "PTR"],
          description: "Optional: filter by record type",
        },
      },
      required: ["record_name"],
    },
    annotations: {
      title: "Find DNS Records",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "backup_dns_records",
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
      title: "Backup DNS Records",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
];
