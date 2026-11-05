/**
 * Zod validation schemas for MCP tool inputs
 */

import { z } from "zod";

import { ZONE_STATUSES } from "../cloudflare/types.js";

/**
 * DNS record types the tools accept — the full enum the current API exposes
 * (SOA is system-managed and not part of the API's record-type enum).
 * Structured types (CAA, HTTPS, SVCB, ...) are created/updated via the
 * `data` object rather than a `content` string.
 */
export const DNS_RECORD_TYPES = [
  "A",
  "AAAA",
  "CNAME",
  "TXT",
  "MX",
  "NS",
  "SRV",
  "CAA",
  "PTR",
  "HTTPS",
  "SVCB",
  "TLSA",
  "SSHFP",
  "URI",
  "CERT",
  "DS",
  "LOC",
  "NAPTR",
  "SMIMEA",
  "DNSKEY",
  "OPENPGPKEY",
] as const;

/**
 * Cloudflare TTL: `1` means "automatic"; otherwise the value must be an integer
 * between 60 and 86400 seconds, with the minimum reduced to 30 for Enterprise
 * zones. Values in 2–29 are rejected by the API on all plans; the API enforces
 * the 60-second floor for non-Enterprise zones with a clear error.
 */
const ttlSchema = z.union([z.literal(1), z.number().int().min(30).max(86400)]);

// Single source of truth for zone statuses lives next to the ZoneStatus type.
export { ZONE_STATUSES };

/**
 * Structured record data for types whose `content` is read-only on the API,
 * e.g. CAA `{ flags, tag, value }`, SRV, or HTTPS/SVCB service parameters.
 */
const recordDataSchema = z.record(z.string(), z.unknown());

// Descriptions here are what MCP clients see: the SDK publishes each tool's
// JSON Schema straight from these Zod schemas, so they are the single source
// of truth for both validation and the advertised input schema.

const zoneIdField = z.string().describe("The zone ID");
const domainNameField = z
  .string()
  .describe("The domain name (alternative to zone_id)");
const ZONE_REF_REQUIRED = {
  message: "Either zone_id or domain_name is required",
};

export const AddZoneSchema = z.object({
  name: z.string().describe("The domain name to add (e.g., 'example.com')"),
  account_id: z
    .string()
    .describe("Your Cloudflare account ID (found in dashboard URL or API)"),
  type: z
    .enum(["full", "partial", "secondary", "internal"])
    .optional()
    .default("full")
    .describe(
      "Zone type: 'full' (default) for full DNS management, 'partial' for CNAME setup, 'secondary' for secondary DNS, 'internal' for internal zones"
    ),
});

export const ListZonesSchema = z.object({
  page: z
    .number()
    .optional()
    .default(1)
    .describe("Page number for pagination (default: 1)"),
  per_page: z
    .number()
    .min(5)
    .max(50)
    .optional()
    .default(50)
    .describe("Number of zones per page, 5-50 (default: 50)"),
  name: z
    .string()
    .optional()
    .describe("Filter by domain name (partial match supported)"),
  status: z.enum(ZONE_STATUSES).optional().describe("Filter by zone status"),
});

export const GetZoneSchema = z
  .object({
    zone_id: z
      .string()
      .optional()
      .describe("The zone ID (32-character hex string)"),
    domain_name: z
      .string()
      .optional()
      .describe("The domain name (e.g., 'example.com')"),
  })
  .refine((data) => data.zone_id || data.domain_name, ZONE_REF_REQUIRED);

export const ListDNSRecordsSchema = z
  .object({
    zone_id: zoneIdField.optional(),
    domain_name: domainNameField.optional(),
    type: z.enum(DNS_RECORD_TYPES).optional().describe("Filter by record type"),
    name: z
      .string()
      .optional()
      .describe("Filter by record name (e.g., 'www.example.com')"),
    page: z.number().optional().default(1).describe("Page number (default: 1)"),
    per_page: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .default(100)
      .describe("Results per page, max 100 (default: 100)"),
  })
  .refine((data) => data.zone_id || data.domain_name, ZONE_REF_REQUIRED);

export const GetDNSRecordSchema = z.object({
  zone_id: zoneIdField,
  record_id: z.string().describe("The DNS record ID"),
});

export const CreateDNSRecordSchema = z
  .object({
    zone_id: zoneIdField.optional(),
    domain_name: domainNameField.optional(),
    type: z.enum(DNS_RECORD_TYPES).describe("DNS record type"),
    name: z
      .string()
      .describe(
        "DNS record name. Use '@' or the domain name for root, or specify subdomain (e.g., 'www', 'api')"
      ),
    // Optional: structured records (CAA, HTTPS, SVCB, ...) supply `data` instead.
    content: z
      .string()
      .optional()
      .describe(
        "Record content: IP address for A/AAAA, hostname for CNAME/MX, text for TXT. Required for simple records; omit for structured records that use 'data' (e.g. CAA)."
      ),
    ttl: ttlSchema
      .optional()
      .default(1)
      .describe(
        "TTL in seconds. Use 1 for automatic (default). Otherwise 60-86400 (minimum 30 for Enterprise zones)."
      ),
    proxied: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Whether to proxy traffic through Cloudflare (orange cloud). Only for A, AAAA, CNAME. Default: false"
      ),
    priority: z
      .number()
      .int()
      .min(0)
      .max(65535)
      .optional()
      .describe("Priority for MX and URI records (required for those types)"),
    comment: z.string().optional().describe("Optional comment for the record"),
    tags: z
      .array(z.string())
      .optional()
      .describe("Optional custom tags for the record"),
    data: recordDataSchema
      .optional()
      .describe(
        "Structured data for record types whose content is read-only, e.g. CAA { flags, tag, value }, SRV { priority, weight, port, target } (put the service and protocol in 'name', e.g. '_sip._tcp'), or HTTPS/SVCB service parameters."
      ),
  })
  .refine((data) => data.zone_id || data.domain_name, ZONE_REF_REQUIRED)
  .refine((data) => data.content !== undefined || data.data !== undefined, {
    message:
      "Either content (for simple records) or data (for structured records like CAA) is required",
  });

export const UpdateDNSRecordSchema = z.object({
  zone_id: zoneIdField,
  record_id: z.string().describe("The DNS record ID to update"),
  type: z
    .enum(DNS_RECORD_TYPES)
    .optional()
    .describe(
      "New record type. Changing it replaces the record with a new ID and requires new 'content' (or 'data'); name, TTL, comment and tags carry over unless given."
    ),
  name: z.string().optional().describe("New record name"),
  content: z.string().optional().describe("New record content"),
  ttl: ttlSchema
    .optional()
    .describe(
      "New TTL in seconds (1 for automatic, otherwise 60-86400; minimum 30 for Enterprise zones)"
    ),
  proxied: z.boolean().optional().describe("New proxy status"),
  priority: z
    .number()
    .int()
    .min(0)
    .max(65535)
    .optional()
    .describe("New priority (for MX and URI records)"),
  comment: z.string().optional().describe("New comment"),
  tags: z
    .array(z.string())
    .optional()
    .describe("New custom tags for the record"),
  data: recordDataSchema
    .optional()
    .describe(
      "New structured data for record types like CAA/SRV/HTTPS/SVCB (see create_dns_record)."
    ),
});

export const DeleteDNSRecordSchema = z.object({
  zone_id: zoneIdField,
  record_id: z.string().describe("The DNS record ID to delete"),
});

export const FindDNSRecordsSchema = z
  .object({
    zone_id: zoneIdField.optional(),
    domain_name: domainNameField.optional(),
    record_name: z
      .string()
      .describe(
        "The DNS record name to search for (e.g., 'www.example.com', 'example.com', 'api.example.com')"
      ),
    type: z
      .enum(DNS_RECORD_TYPES)
      .optional()
      .describe("Optional: filter by record type"),
  })
  .refine((data) => data.zone_id || data.domain_name, ZONE_REF_REQUIRED);

// If neither zone_id nor domain_name is provided, ALL zones are backed up.
export const BackupDNSRecordsSchema = z.object({
  zone_id: z
    .string()
    .optional()
    .describe(
      "The zone ID to backup. If not provided (along with domain_name), backs up ALL domains."
    ),
  domain_name: z
    .string()
    .optional()
    .describe(
      "The domain name to backup. If not provided (along with zone_id), backs up ALL domains."
    ),
});

export type AddZoneInput = z.output<typeof AddZoneSchema>;
export type ListZonesInput = z.output<typeof ListZonesSchema>;
export type GetZoneInput = z.output<typeof GetZoneSchema>;
export type ListDNSRecordsInput = z.output<typeof ListDNSRecordsSchema>;
export type GetDNSRecordInput = z.output<typeof GetDNSRecordSchema>;
export type CreateDNSRecordToolInput = z.output<typeof CreateDNSRecordSchema>;
export type UpdateDNSRecordToolInput = z.output<typeof UpdateDNSRecordSchema>;
export type DeleteDNSRecordInput = z.output<typeof DeleteDNSRecordSchema>;
export type FindDNSRecordsInput = z.output<typeof FindDNSRecordsSchema>;
export type BackupDNSRecordsInput = z.output<typeof BackupDNSRecordsSchema>;
