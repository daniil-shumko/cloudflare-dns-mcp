/**
 * Zod validation schemas for MCP tool inputs
 */

import { z } from "zod";

/**
 * DNS record types the tools accept. SOA is intentionally excluded — it is
 * system-managed and read-only. Structured types (CAA, HTTPS, SVCB, ...) are
 * created/updated via the `data` object rather than a `content` string.
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
 * between 60 and 86400 seconds. Values in 2–59 are rejected by the API.
 */
const ttlSchema = z.union([z.literal(1), z.number().int().min(60).max(86400)]);

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
  status: z
    .enum([
      "active",
      "pending",
      "initializing",
      "moved",
      "deleted",
      "deactivated",
    ])
    .optional(),
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
