/**
 * MCP Tool handler implementations
 */

import { CloudflareClient } from "../cloudflare/client.js";
import type { DNSRecordType, ZoneSummary, DNSRecordSummary } from "../cloudflare/types.js";
import { formatError, formatSuccess } from "../utils/errors.js";
import {
  AddZoneSchema,
  ListZonesSchema,
  GetZoneSchema,
  ListDNSRecordsSchema,
  GetDNSRecordSchema,
  CreateDNSRecordSchema,
  UpdateDNSRecordSchema,
  DeleteDNSRecordSchema,
  FindDNSRecordsSchema,
  BackupDNSRecordsSchema,
} from "./schemas.js";
import type { DNSRecordBackup, ZoneBackup, FullBackup } from "./types.js";
import { PAGINATION_LIMITS } from "./types.js";

// ==================== Helper Functions ====================

function summarizeZone(zone: {
  id: string;
  name: string;
  status: string;
  name_servers: string[];
  plan: { name: string };
  created_on: string;
  modified_on: string;
}): ZoneSummary {
  return {
    id: zone.id,
    name: zone.name,
    status: zone.status as ZoneSummary["status"],
    name_servers: zone.name_servers,
    plan: zone.plan.name,
    created_on: zone.created_on,
    modified_on: zone.modified_on,
  };
}

function summarizeDNSRecord(record: {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
  priority?: number;
  comment?: string | null;
  created_on: string;
  modified_on: string;
}): DNSRecordSummary {
  return {
    id: record.id,
    type: record.type as DNSRecordType,
    name: record.name,
    content: record.content,
    proxied: record.proxied,
    ttl: record.ttl === 1 ? "auto" : record.ttl,
    ...(record.priority !== undefined && { priority: record.priority }),
    comment: record.comment,
    created_on: record.created_on,
    modified_on: record.modified_on,
  };
}

// ==================== Tool Response Type ====================

export interface ToolResponse {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

// ==================== Tool Handlers ====================

export async function handleAddZone(
  cloudflare: CloudflareClient,
  args: unknown
): Promise<ToolResponse> {
  const input = AddZoneSchema.parse(args);
  const response = await cloudflare.createZone(input.name, input.account_id, {
    type: input.type,
    jump_start: input.jump_start,
  });

  const zone = response.result;
  const result = formatSuccess(
    {
      id: zone.id,
      name: zone.name,
      status: zone.status,
      name_servers: zone.name_servers,
      plan: zone.plan.name,
      created_on: zone.created_on,
    },
    `Successfully added zone "${input.name}". Update your domain's nameservers to: ${zone.name_servers.join(", ")}`
  );

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

export async function handleListZones(
  cloudflare: CloudflareClient,
  args: unknown
): Promise<ToolResponse> {
  const input = ListZonesSchema.parse(args);
  const response = await cloudflare.listZones({
    page: input.page,
    per_page: input.per_page,
    name: input.name,
    status: input.status,
  });

  const zones = response.result.map(summarizeZone);
  const result = formatSuccess(
    {
      zones,
      pagination: response.result_info
        ? {
            page: response.result_info.page,
            per_page: response.result_info.per_page,
            total_pages: response.result_info.total_pages,
            total_count: response.result_info.total_count,
          }
        : undefined,
    },
    `Found ${zones.length} zone(s)`
  );

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

export async function handleGetZoneDetails(
  cloudflare: CloudflareClient,
  args: unknown
): Promise<ToolResponse> {
  const input = GetZoneSchema.parse(args);
  let zoneId: string;

  if (input.zone_id) {
    zoneId = input.zone_id;
  } else {
    zoneId = await cloudflare.resolveZoneId(input.domain_name!);
  }

  const response = await cloudflare.getZone(zoneId);
  const zone = response.result;

  const result = formatSuccess({
    id: zone.id,
    name: zone.name,
    status: zone.status,
    paused: zone.paused,
    type: zone.type,
    name_servers: zone.name_servers,
    original_name_servers: zone.original_name_servers,
    plan: {
      name: zone.plan.name,
      price: zone.plan.price,
      currency: zone.plan.currency,
    },
    account: zone.account,
    created_on: zone.created_on,
    modified_on: zone.modified_on,
    activated_on: zone.activated_on,
  });

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

export async function handleListDNSRecords(
  cloudflare: CloudflareClient,
  args: unknown
): Promise<ToolResponse> {
  const input = ListDNSRecordsSchema.parse(args);
  let zoneId: string;

  if (input.zone_id) {
    zoneId = input.zone_id;
  } else {
    zoneId = await cloudflare.resolveZoneId(input.domain_name!);
  }

  const response = await cloudflare.listDNSRecords(zoneId, {
    type: input.type,
    name: input.name,
    page: input.page,
    per_page: input.per_page,
  });

  const records = response.result.map(summarizeDNSRecord);
  const result = formatSuccess(
    {
      zone_id: zoneId,
      records,
      pagination: response.result_info
        ? {
            page: response.result_info.page,
            per_page: response.result_info.per_page,
            total_pages: response.result_info.total_pages,
            total_count: response.result_info.total_count,
          }
        : undefined,
    },
    `Found ${records.length} DNS record(s)`
  );

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

export async function handleGetDNSRecord(
  cloudflare: CloudflareClient,
  args: unknown
): Promise<ToolResponse> {
  const input = GetDNSRecordSchema.parse(args);
  const response = await cloudflare.getDNSRecord(input.zone_id, input.record_id);

  const result = formatSuccess(summarizeDNSRecord(response.result));

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

export async function handleCreateDNSRecord(
  cloudflare: CloudflareClient,
  args: unknown
): Promise<ToolResponse> {
  const input = CreateDNSRecordSchema.parse(args);
  let zoneId: string;

  if (input.zone_id) {
    zoneId = input.zone_id;
  } else {
    zoneId = await cloudflare.resolveZoneId(input.domain_name!);
  }

  const response = await cloudflare.createDNSRecord(zoneId, {
    type: input.type as DNSRecordType,
    name: input.name,
    content: input.content,
    ttl: input.ttl,
    proxied: input.proxied,
    priority: input.priority,
    comment: input.comment,
  });

  const result = formatSuccess(
    summarizeDNSRecord(response.result),
    `Successfully created ${input.type} record for ${input.name}`
  );

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

export async function handleUpdateDNSRecord(
  cloudflare: CloudflareClient,
  args: unknown
): Promise<ToolResponse> {
  const input = UpdateDNSRecordSchema.parse(args);

  const updateData: Record<string, unknown> = {};
  if (input.type !== undefined) updateData.type = input.type;
  if (input.name !== undefined) updateData.name = input.name;
  if (input.content !== undefined) updateData.content = input.content;
  if (input.ttl !== undefined) updateData.ttl = input.ttl;
  if (input.proxied !== undefined) updateData.proxied = input.proxied;
  if (input.comment !== undefined) updateData.comment = input.comment;

  const response = await cloudflare.updateDNSRecord(
    input.zone_id,
    input.record_id,
    updateData
  );

  const result = formatSuccess(
    summarizeDNSRecord(response.result),
    `Successfully updated DNS record ${input.record_id}`
  );

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

export async function handleDeleteDNSRecord(
  cloudflare: CloudflareClient,
  args: unknown
): Promise<ToolResponse> {
  const input = DeleteDNSRecordSchema.parse(args);

  // Get record details before deletion for confirmation message
  let recordInfo = "";
  try {
    const recordResponse = await cloudflare.getDNSRecord(
      input.zone_id,
      input.record_id
    );
    const record = recordResponse.result;
    recordInfo = ` (${record.type} ${record.name} -> ${record.content})`;
  } catch {
    // Ignore if we can't get record details
  }

  await cloudflare.deleteDNSRecord(input.zone_id, input.record_id);

  const result = formatSuccess(
    { deleted_id: input.record_id },
    `Successfully deleted DNS record${recordInfo}`
  );

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

export async function handleFindDNSRecords(
  cloudflare: CloudflareClient,
  args: unknown
): Promise<ToolResponse> {
  const input = FindDNSRecordsSchema.parse(args);
  let zoneId: string;

  if (input.zone_id) {
    zoneId = input.zone_id;
  } else {
    zoneId = await cloudflare.resolveZoneId(input.domain_name!);
  }

  const records = await cloudflare.findDNSRecordsByName(
    zoneId,
    input.record_name,
    input.type
  );

  const summarizedRecords = records.map(summarizeDNSRecord);
  const result = formatSuccess(
    {
      zone_id: zoneId,
      search_name: input.record_name,
      search_type: input.type || "all",
      records: summarizedRecords,
    },
    `Found ${records.length} matching record(s) for "${input.record_name}"`
  );

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

export async function handleBackupDNSRecords(
  cloudflare: CloudflareClient,
  args: unknown
): Promise<ToolResponse> {
  const input = BackupDNSRecordsSchema.parse(args);
  const zonesToBackup: Array<{ id: string; name: string }> = [];

  // Determine which zones to backup
  if (input.zone_id) {
    // Backup single zone by ID
    const zoneResponse = await cloudflare.getZone(input.zone_id);
    zonesToBackup.push({
      id: zoneResponse.result.id,
      name: zoneResponse.result.name,
    });
  } else if (input.domain_name) {
    // Backup single zone by name
    const zoneId = await cloudflare.resolveZoneId(input.domain_name);
    const zoneResponse = await cloudflare.getZone(zoneId);
    zonesToBackup.push({
      id: zoneResponse.result.id,
      name: zoneResponse.result.name,
    });
  } else {
    // Backup ALL zones with safety limit
    let page = 1;
    let hasMore = true;
    while (hasMore && page <= PAGINATION_LIMITS.MAX_ZONE_PAGES) {
      const zonesResponse = await cloudflare.listZones({
        page,
        per_page: 50,
      });
      for (const zone of zonesResponse.result) {
        if (zonesToBackup.length >= PAGINATION_LIMITS.MAX_ZONES_BACKUP) {
          hasMore = false;
          break;
        }
        zonesToBackup.push({ id: zone.id, name: zone.name });
      }
      if (
        zonesResponse.result_info &&
        page < zonesResponse.result_info.total_pages &&
        zonesToBackup.length < PAGINATION_LIMITS.MAX_ZONES_BACKUP
      ) {
        page++;
      } else {
        hasMore = false;
      }
    }
  }

  // Backup records for each zone
  const zoneBackups: ZoneBackup[] = [];
  let totalRecords = 0;

  for (const zone of zonesToBackup) {
    const records: DNSRecordBackup[] = [];
    let page = 1;
    let hasMore = true;

    while (
      hasMore &&
      page <= PAGINATION_LIMITS.MAX_RECORD_PAGES &&
      records.length < PAGINATION_LIMITS.MAX_RECORDS_PER_ZONE
    ) {
      const recordsResponse = await cloudflare.listDNSRecords(zone.id, {
        page,
        per_page: 100,
      });

      for (const record of recordsResponse.result) {
        // Only backup user-manageable record types
        // Skip SOA and some system records
        if (record.type === "SOA") continue;
        if (records.length >= PAGINATION_LIMITS.MAX_RECORDS_PER_ZONE) break;

        const backupRecord: DNSRecordBackup = {
          type: record.type,
          name: record.name,
          content: record.content,
          ttl: record.ttl,
          proxied: record.proxied,
        };

        if (record.priority !== undefined) {
          backupRecord.priority = record.priority;
        }
        if (record.comment) {
          backupRecord.comment = record.comment;
        }

        records.push(backupRecord);
      }

      if (
        recordsResponse.result_info &&
        page < recordsResponse.result_info.total_pages &&
        records.length < PAGINATION_LIMITS.MAX_RECORDS_PER_ZONE
      ) {
        page++;
      } else {
        hasMore = false;
      }
    }

    zoneBackups.push({
      zone_id: zone.id,
      zone_name: zone.name,
      records,
      record_count: records.length,
    });
    totalRecords += records.length;
  }

  const backup: FullBackup = {
    version: "1.0",
    created_at: new Date().toISOString(),
    backup_type:
      input.zone_id || input.domain_name ? "single_zone" : "all_zones",
    zones: zoneBackups,
    total_zones: zoneBackups.length,
    total_records: totalRecords,
  };

  const message =
    backup.backup_type === "single_zone"
      ? `Backed up ${totalRecords} DNS record(s) from ${zoneBackups[0]?.zone_name}`
      : `Backed up ${totalRecords} DNS record(s) from ${zoneBackups.length} zone(s)`;

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message,
            backup,
          },
          null,
          2
        ),
      },
    ],
  };
}

// ==================== Handler Registry ====================

type ToolHandler = (
  cloudflare: CloudflareClient,
  args: unknown
) => Promise<ToolResponse>;

export const toolHandlers: Record<string, ToolHandler> = {
  add_zone: handleAddZone,
  list_zones: handleListZones,
  get_zone_details: handleGetZoneDetails,
  list_dns_records: handleListDNSRecords,
  get_dns_record: handleGetDNSRecord,
  create_dns_record: handleCreateDNSRecord,
  update_dns_record: handleUpdateDNSRecord,
  delete_dns_record: handleDeleteDNSRecord,
  find_dns_records: handleFindDNSRecords,
  backup_dns_records: handleBackupDNSRecords,
};

// ==================== Main Handler Dispatcher ====================

export async function handleToolCall(
  cloudflare: CloudflareClient,
  name: string,
  args: unknown
): Promise<ToolResponse> {
  const handler = toolHandlers[name];

  if (!handler) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            formatError(new Error(`Unknown tool: ${name}`)),
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  return handler(cloudflare, args);
}
