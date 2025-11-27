/**
 * Zod validation schemas for MCP tool inputs
 */

import { z } from "zod";

export const AddZoneSchema = z.object({
  name: z.string().describe("The domain name to add (e.g., 'example.com')"),
  account_id: z.string().describe("Your Cloudflare account ID"),
  type: z.enum(["full", "partial", "secondary"]).optional().default("full"),
  jump_start: z.boolean().optional().default(false),
});

export const ListZonesSchema = z.object({
  page: z.number().optional().default(1),
  per_page: z.number().min(1).max(50).optional().default(50),
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
    type: z
      .enum(["A", "AAAA", "CNAME", "TXT", "MX", "NS", "SRV", "CAA", "PTR"])
      .optional(),
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
    type: z.enum(["A", "AAAA", "CNAME", "TXT", "MX", "NS", "SRV", "CAA"]),
    name: z.string(),
    content: z.string(),
    ttl: z.number().min(1).max(86400).optional().default(1),
    proxied: z.boolean().optional().default(false),
    priority: z.number().optional(),
    comment: z.string().optional(),
  })
  .refine((data) => data.zone_id || data.domain_name, {
    message: "Either zone_id or domain_name is required",
  });

export const UpdateDNSRecordSchema = z.object({
  zone_id: z.string(),
  record_id: z.string(),
  type: z
    .enum(["A", "AAAA", "CNAME", "TXT", "MX", "NS", "SRV", "CAA"])
    .optional(),
  name: z.string().optional(),
  content: z.string().optional(),
  ttl: z.number().min(1).max(86400).optional(),
  proxied: z.boolean().optional(),
  comment: z.string().optional(),
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
    type: z
      .enum(["A", "AAAA", "CNAME", "TXT", "MX", "NS", "SRV", "CAA", "PTR"])
      .optional(),
  })
  .refine((data) => data.zone_id || data.domain_name, {
    message: "Either zone_id or domain_name is required",
  });

export const BackupDNSRecordsSchema = z.object({
  zone_id: z.string().optional(),
  domain_name: z.string().optional(),
  // If neither is provided, backup ALL domains
});
