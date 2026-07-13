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

export const AddZoneSchema = z.object({
  name: z.string().describe("The domain name to add (e.g., 'example.com')"),
  account_id: z.string().describe("Your Cloudflare account ID"),
  type: z
    .enum(["full", "partial", "secondary", "internal"])
    .optional()
    .default("full"),
});

export const ListZonesSchema = z.object({
  page: z.number().optional().default(1),
  per_page: z.number().min(5).max(50).optional().default(50),
  name: z.string().optional(),
  status: z.enum(ZONE_STATUSES).optional(),
});

export const GetZoneSchema = z
  .object({
    zone_id: z.string().optional(),
    domain_name: z.string().optional(),
  })
  .refine((data) => data.zone_id || data.domain_name, {
    message: "Either zone_id or domain_name is required",
  });

export const ListDNSRecordsSchema = z
  .object({
    zone_id: z.string().optional(),
    domain_name: z.string().optional(),
    type: z.enum(DNS_RECORD_TYPES).optional(),
    name: z.string().optional(),
    page: z.number().optional().default(1),
    per_page: z.number().min(1).max(100).optional().default(100),
  })
  .refine((data) => data.zone_id || data.domain_name, {
    message: "Either zone_id or domain_name is required",
  });

export const GetDNSRecordSchema = z.object({
  zone_id: z.string(),
  record_id: z.string(),
});

export const CreateDNSRecordSchema = z
  .object({
    zone_id: z.string().optional(),
    domain_name: z.string().optional(),
    type: z.enum(DNS_RECORD_TYPES),
    name: z.string(),
    // Optional: structured records (CAA, HTTPS, SVCB, ...) supply `data` instead.
    content: z.string().optional(),
    ttl: ttlSchema.optional().default(1),
    proxied: z.boolean().optional().default(false),
    priority: z.number().int().min(0).max(65535).optional(),
    comment: z.string().optional(),
    tags: z.array(z.string()).optional(),
    data: recordDataSchema.optional(),
  })
  .refine((data) => data.zone_id || data.domain_name, {
    message: "Either zone_id or domain_name is required",
  })
  .refine((data) => data.content !== undefined || data.data !== undefined, {
    message:
      "Either content (for simple records) or data (for structured records like CAA) is required",
  });

export const UpdateDNSRecordSchema = z.object({
  zone_id: z.string(),
  record_id: z.string(),
  type: z.enum(DNS_RECORD_TYPES).optional(),
  name: z.string().optional(),
  content: z.string().optional(),
  ttl: ttlSchema.optional(),
  proxied: z.boolean().optional(),
  priority: z.number().int().min(0).max(65535).optional(),
  comment: z.string().optional(),
  tags: z.array(z.string()).optional(),
  data: recordDataSchema.optional(),
});

export const DeleteDNSRecordSchema = z.object({
  zone_id: z.string(),
  record_id: z.string(),
});

export const FindDNSRecordsSchema = z
  .object({
    zone_id: z.string().optional(),
    domain_name: z.string().optional(),
    record_name: z.string(),
    type: z.enum(DNS_RECORD_TYPES).optional(),
  })
  .refine((data) => data.zone_id || data.domain_name, {
    message: "Either zone_id or domain_name is required",
  });

export const BackupDNSRecordsSchema = z.object({
  zone_id: z.string().optional(),
  domain_name: z.string().optional(),
  // If neither is provided, backup ALL domains
});
