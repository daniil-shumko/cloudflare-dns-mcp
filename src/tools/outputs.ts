/**
 * Output schemas for the read-only tools' structuredContent.
 *
 * The SDK validates every successful result against these before sending it,
 * and a mismatch turns the call into an error — so they are deliberately
 * lenient: only identifying fields are required, everything Cloudflare might
 * omit is optional/nullable, and unknown keys are allowed (looseObject) so a
 * new API field can never break a working tool. They describe the shape for
 * clients; they are not a strict contract on Cloudflare's responses.
 */

import { z } from "zod";

const paginationSchema = z
  .looseObject({
    page: z.number().optional(),
    per_page: z.number().optional(),
    total_pages: z.number().optional(),
    total_count: z.number().optional(),
  })
  .optional()
  .describe("Pagination info from Cloudflare, when returned");

const zoneSummarySchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  status: z.string().optional(),
  name_servers: z.array(z.string()).optional(),
  plan: z.string().nullable().optional(),
  created_on: z.string().optional(),
  modified_on: z.string().optional(),
});

const dnsRecordSummarySchema = z.looseObject({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  content: z.string().optional(),
  proxied: z.boolean().optional(),
  ttl: z
    .union([z.number(), z.literal("auto")])
    .optional()
    .describe("TTL in seconds, or 'auto' for Cloudflare's automatic TTL"),
  priority: z.number().optional(),
  comment: z.string().nullable().optional(),
  created_on: z.string().optional(),
  modified_on: z.string().optional(),
});

/** The `{ success, message?, data }` envelope every successful tool returns. */
function successEnvelope<T extends z.ZodType>(data: T) {
  return z.looseObject({
    success: z.literal(true),
    message: z.string().optional(),
    data,
  });
}

export const ListZonesOutputSchema = successEnvelope(
  z.looseObject({
    zones: z.array(zoneSummarySchema),
    pagination: paginationSchema,
  })
);

export const GetZoneDetailsOutputSchema = successEnvelope(
  zoneSummarySchema.extend({
    paused: z.boolean().optional(),
    type: z.string().optional(),
    original_name_servers: z.array(z.string()).nullable().optional(),
    plan: z
      .looseObject({
        name: z.string().nullable().optional(),
        price: z.number().optional(),
        currency: z.string().optional(),
      })
      .nullable()
      .optional(),
    account: z
      .looseObject({ id: z.string().optional(), name: z.string().optional() })
      .optional(),
    activated_on: z.string().nullable().optional(),
  })
);

export const ListDNSRecordsOutputSchema = successEnvelope(
  z.looseObject({
    zone_id: z.string(),
    records: z.array(dnsRecordSummarySchema),
    pagination: paginationSchema,
  })
);

export const GetDNSRecordOutputSchema = successEnvelope(dnsRecordSummarySchema);

export const FindDNSRecordsOutputSchema = successEnvelope(
  z.looseObject({
    zone_id: z.string(),
    search_name: z.string(),
    search_type: z.string(),
    records: z.array(dnsRecordSummarySchema),
  })
);
