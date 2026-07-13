/**
 * Cloudflare API Types
 * Based on Cloudflare API v4 documentation
 */

// Generic API Response wrapper
export interface CloudflareResponse<T> {
  success: boolean;
  errors: CloudflareError[];
  messages: CloudflareMessage[];
  result: T;
  result_info?: ResultInfo;
}

export interface CloudflareError {
  code: number;
  message: string;
  documentation_url?: string;
  source?: { pointer?: string };
}

export interface CloudflareMessage {
  code: number;
  message: string;
  documentation_url?: string;
}

export interface ResultInfo {
  page: number;
  per_page: number;
  total_pages: number;
  count: number;
  total_count: number;
}

// Zone (Domain) types
export interface Zone {
  id: string;
  name: string;
  status: ZoneStatus;
  paused: boolean;
  type: "full" | "partial" | "secondary" | "internal";
  development_mode: number;
  name_servers: string[];
  original_name_servers: string[] | null;
  original_registrar: string | null;
  original_dnshost: string | null;
  modified_on: string;
  created_on: string;
  activated_on: string | null;
  meta: ZoneMeta;
  owner: ZoneOwner;
  account: ZoneAccount;
  vanity_name_servers?: string[];
  verification_key?: string;
  cname_suffix?: string;
  /** Deprecated in the API (replaced by account memberships); never read here. */
  permissions?: string[];
  /**
   * Deprecated in the API (replaced by GET /zones/{zone_id}/subscription).
   * Still returned today, but treat as removable — always guard access.
   */
  plan?: ZonePlan;
}

/**
 * Zone statuses the current API accepts (both as a list filter and in
 * responses). `deleted`/`deactivated` were removed from the API enum.
 */
export const ZONE_STATUSES = [
  "active",
  "pending",
  "initializing",
  "moved",
] as const;

export type ZoneStatus = (typeof ZONE_STATUSES)[number];

export interface ZoneMeta {
  cdn_only?: boolean;
  custom_certificate_quota?: number;
  dns_only?: boolean;
  foundation_dns?: boolean;
  page_rule_quota?: number;
  phishing_detected?: boolean;
  step?: number;
}

export interface ZoneOwner {
  id?: string | null;
  name?: string | null;
  type?: string;
}

export interface ZoneAccount {
  id: string;
  name: string;
}

export interface ZonePlan {
  id?: string;
  name?: string;
  price?: number;
  currency?: string;
  frequency?: string;
  is_subscribed?: boolean;
  can_subscribe?: boolean;
  legacy_id?: string;
  legacy_discount?: boolean;
  externally_managed?: boolean;
}

// DNS Record types
export type DNSRecordType =
  | "A"
  | "AAAA"
  | "CNAME"
  | "TXT"
  | "MX"
  | "NS"
  | "SRV"
  | "CAA"
  | "PTR"
  | "CERT"
  | "DNSKEY"
  | "DS"
  | "LOC"
  | "NAPTR"
  | "OPENPGPKEY"
  | "SMIMEA"
  | "SSHFP"
  | "SVCB"
  | "TLSA"
  | "URI"
  | "HTTPS";

export interface DNSRecord {
  id: string;
  name: string;
  type: DNSRecordType;
  content: string;
  proxiable: boolean;
  proxied: boolean;
  ttl: number;
  meta: DNSRecordMeta;
  comment: string | null;
  tags: string[];
  created_on: string;
  modified_on: string;
  comment_modified_on?: string;
  tags_modified_on?: string;
  settings?: DNSRecordSettings;
  // MX-specific
  priority?: number;
  // SRV-specific
  data?: SRVData | CAAData | Record<string, unknown>;
}

/** The API declares meta as an opaque object; these are its documented keys. */
export interface DNSRecordMeta {
  is_glue?: boolean;
  dead_glue?: boolean;
  shadowed_by?: string[];
  shadowed_records_count?: number;
  [key: string]: unknown;
}

export interface DNSRecordSettings {
  /** A/AAAA only: serve this record only over IPv4 / IPv6. */
  ipv4_only?: boolean;
  ipv6_only?: boolean;
  /** Unproxied CNAME only: flatten to the target's address records. */
  flatten_cname?: boolean;
}

export interface SRVData {
  service: string;
  proto: string;
  name: string;
  priority: number;
  weight: number;
  port: number;
  target: string;
}

export interface CAAData {
  flags: number;
  tag: string;
  value: string;
}

// API Input types
export interface ListZonesParams {
  name?: string;
  status?: ZoneStatus;
  account_id?: string;
  account_name?: string;
  page?: number;
  per_page?: number;
  order?: "name" | "status" | "account.id" | "account.name";
  direction?: "asc" | "desc";
  match?: "any" | "all";
}

export interface ListDNSRecordsParams {
  type?: DNSRecordType;
  name?: string;
  content?: string;
  page?: number;
  per_page?: number;
  order?: "type" | "name" | "content" | "ttl" | "proxied";
  direction?: "asc" | "desc";
  match?: "any" | "all";
  tag?: string;
  tag_match?: "any" | "all";
  search?: string;
  comment?: string;
}

export interface CreateDNSRecordInput {
  type: DNSRecordType;
  name: string;
  // Optional because structured records (CAA, HTTPS, SVCB, ...) set their
  // content via the `data` object — their `content` field is read-only.
  content?: string;
  ttl?: number;
  proxied?: boolean;
  priority?: number;
  comment?: string;
  tags?: string[];
  // Structured data for record types like CAA/SRV/HTTPS/SVCB
  data?: SRVData | CAAData | Record<string, unknown>;
}

export interface UpdateDNSRecordInput {
  type?: DNSRecordType;
  name?: string;
  content?: string;
  ttl?: number;
  proxied?: boolean;
  priority?: number;
  comment?: string;
  tags?: string[];
  data?: SRVData | CAAData | Record<string, unknown>;
}

// Delete response
export interface DeleteResult {
  id: string;
}

// Simplified output types for MCP tool responses
export interface ZoneSummary {
  id: string;
  name: string;
  status: ZoneStatus;
  name_servers: string[];
  /** null when the API omits the deprecated plan object */
  plan: string | null;
  created_on: string;
  modified_on: string;
}

export interface DNSRecordSummary {
  id: string;
  type: DNSRecordType;
  name: string;
  content: string;
  proxied: boolean;
  ttl: number | "auto";
  priority?: number;
  comment?: string | null;
  created_on: string;
  modified_on: string;
}
