/**
 * Types specific to MCP tools (backup structures, etc.)
 */

export interface DNSRecordBackup {
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
  priority?: number;
  comment?: string | null;
}

export interface ZoneBackup {
  zone_id: string;
  zone_name: string;
  records: DNSRecordBackup[];
  record_count: number;
}

export interface FullBackup {
  version: "1.0";
  created_at: string;
  backup_type: "single_zone" | "all_zones";
  zones: ZoneBackup[];
  total_zones: number;
  total_records: number;
}

/**
 * Safety limits for pagination to prevent infinite loops
 */
export const PAGINATION_LIMITS = {
  /** Maximum pages to fetch when listing zones */
  MAX_ZONE_PAGES: 100,
  /** Maximum pages to fetch when listing DNS records per zone */
  MAX_RECORD_PAGES: 100,
  /** Maximum total zones to backup in a single operation */
  MAX_ZONES_BACKUP: 500,
  /** Maximum total records to backup per zone */
  MAX_RECORDS_PER_ZONE: 10000,
} as const;
