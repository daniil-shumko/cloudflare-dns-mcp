/**
 * MCP tool registry: metadata, annotations, input schema and handler per tool.
 *
 * Input schemas are the Zod schemas from ./schemas.ts — the SDK validates
 * arguments against them and publishes their JSON Schema in tools/list, so
 * there is no hand-written JSON Schema to keep in sync.
 */

import type { z } from "zod";

import type { CloudflareClient } from "../cloudflare/client.js";
import * as handlers from "./handlers.js";
import type { ToolResponse } from "./handlers.js";
import * as schemas from "./schemas.js";

export interface ToolAnnotations {
  title: string;
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
}

export interface ToolDefinition<S extends z.ZodType = z.ZodType> {
  name: string;
  title: string;
  description: string;
  inputSchema: S;
  /** Optional schema for structuredContent on successful results. */
  outputSchema?: z.ZodType;
  annotations: ToolAnnotations;
  handler: (
    cloudflare: CloudflareClient,
    input: z.output<S>
  ) => Promise<ToolResponse>;
}

/**
 * Builds a tool definition, stamping the display title into
 * annotations.title (the pre-2025-06-18 spec's fallback location) so the
 * two can never drift, and tying the handler's input type to its schema.
 */
function defineTool<S extends z.ZodType>(
  tool: Omit<ToolDefinition<S>, "annotations"> & {
    annotations: Omit<ToolAnnotations, "title">;
  }
): ToolDefinition {
  return {
    ...tool,
    annotations: { title: tool.title, ...tool.annotations },
  } as ToolDefinition;
}

export const TOOLS: ToolDefinition[] = [
  defineTool({
    name: "add_zone",
    title: "Add Zone to Cloudflare",
    description:
      "Add a new domain (zone) to your Cloudflare account. The domain's nameservers must be updated at your registrar to point to Cloudflare's nameservers after adding.",
    inputSchema: schemas.AddZoneSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
    handler: handlers.handleAddZone,
  }),
  defineTool({
    name: "list_zones",
    title: "List Cloudflare Zones",
    description:
      "List all domains (zones) on your Cloudflare account. Returns zone IDs, domain names, status, and nameservers.",
    inputSchema: schemas.ListZonesSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: handlers.handleListZones,
  }),
  defineTool({
    name: "get_zone_details",
    title: "Get Zone Details",
    description:
      "Get detailed information about a specific domain/zone including nameservers, plan, and settings. Provide either zone_id or domain_name.",
    inputSchema: schemas.GetZoneSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: handlers.handleGetZoneDetails,
  }),
  defineTool({
    name: "list_dns_records",
    title: "List DNS Records",
    description:
      "List all DNS records for a domain. Returns record types, names, content, TTL, and proxy status. Provide either zone_id or domain_name.",
    inputSchema: schemas.ListDNSRecordsSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: handlers.handleListDNSRecords,
  }),
  defineTool({
    name: "get_dns_record",
    title: "Get DNS Record",
    description:
      "Get details of a specific DNS record by its ID.",
    inputSchema: schemas.GetDNSRecordSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: handlers.handleGetDNSRecord,
  }),
  defineTool({
    name: "create_dns_record",
    title: "Create DNS Record",
    description:
      "Create a new DNS record for a domain. Supports common types (A, AAAA, CNAME, TXT, MX, NS, SRV) via 'content', and structured types (CAA, HTTPS, SVCB, ...) via the 'data' object. Provide either zone_id or domain_name.",
    inputSchema: schemas.CreateDNSRecordSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    handler: handlers.handleCreateDNSRecord,
  }),
  defineTool({
    name: "update_dns_record",
    title: "Update DNS Record",
    description:
      "Update an existing DNS record (partial update). Only specify the fields you want to change. Changing 'type' replaces the record: Cloudflare does not allow in-place type changes, so the old record is deleted and a new one created in a single atomic batch, and the record gets a new ID.",
    inputSchema: schemas.UpdateDNSRecordSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: handlers.handleUpdateDNSRecord,
  }),
  defineTool({
    name: "delete_dns_record",
    title: "Delete DNS Record",
    description:
      "Delete a DNS record. WARNING: This action is irreversible. Make sure you have the correct record_id.",
    inputSchema: schemas.DeleteDNSRecordSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
    handler: handlers.handleDeleteDNSRecord,
  }),
  defineTool({
    name: "find_dns_records",
    title: "Find DNS Records",
    description:
      "Find DNS records by name to get their record IDs. Useful before updating or deleting records when you know the name but not the ID. Returns matching records with their IDs.",
    inputSchema: schemas.FindDNSRecordsSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: handlers.handleFindDNSRecords,
  }),
  defineTool({
    name: "backup_dns_records",
    title: "Backup DNS Records",
    description:
      "Backup DNS records to a JSON format that can be saved and used later to restore records. Can backup a single domain or ALL domains on the account. The output is a complete backup file that agents can save to disk.",
    inputSchema: schemas.BackupDNSRecordsSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: handlers.handleBackupDNSRecords,
  }),
];
