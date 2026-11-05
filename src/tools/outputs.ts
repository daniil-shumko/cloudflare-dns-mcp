/**
 * Output schemas for the read-only tools' structuredContent.
 *
 * The SDK validates every successful result against these before sending it,
 * and a mismatch turns the call into an error — so they are deliberately
 * lenient: only identifying fields are required, every other field may be
 * absent or null (`nullish`), and unknown keys are allowed (looseObject) so a
 * new or sparse API field can never break a working tool. They describe the
 * shape for clients; they are not a strict contract on Cloudflare's responses.
 */

import { z } from "zod";

const paginationSchema = z
  .looseObject({
    page: z.number().nullish(),
    per_page: z.number().nullish(),
    total_pages: z.number().nullish(),
    total_count: z.number().nullish(),
  })
  .nullish()
  .describe("Pagination info from Cloudflare, when returned");

const zoneSummarySchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  status: z.string().nullish(),
  name_servers: z.array(z.string()).nullish(),
  plan: z.string().nullish(),
  created_on: z.string().nullish(),
  modified_on: z.string().nullish(),
});

const dnsRecordSummarySchema = z.looseObject({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  content: z.string().nullish(),
  proxied: z.boolean().nullish(),
  ttl: z
    .union([z.number(), z.literal("auto")])
    .nullish()
    .describe("TTL in seconds, or 'auto' for Cloudflare's automatic TTL"),
  priority: z.number().nullish(),
  comment: z.string().nullish(),
  created_on: z.string().nullish(),
  modified_on: z.string().nullish(),
});

/** The `{ success, message?, data }` envelope every successful tool returns. */
function successEnvelope<T extends z.ZodType>(data: T) {
  return z.looseObject({
    success: z.literal(true),
    message: z.string().nullish(),
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
    paused: z.boolean().nullish(),
    type: z.string().nullish(),
    original_name_servers: z.array(z.string()).nullish(),
    plan: z
      .looseObject({
        name: z.string().nullish(),
        price: z.number().nullish(),
        currency: z.string().nullish(),
      })
      .nullish(),
    account: z
      .looseObject({ id: z.string().nullish(), name: z.string().nullish() })
      .nullish(),
    activated_on: z.string().nullish(),
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
