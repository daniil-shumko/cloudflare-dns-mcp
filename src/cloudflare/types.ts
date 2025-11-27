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
}

export interface CloudflareMessage {
  code: number;
  message: string;
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
  type: "full" | "partial" | "secondary";
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
  permissions: string[];
  plan: ZonePlan;
}

export type ZoneStatus =
  | "active"
  | "pending"
  | "initializing"
  | "moved"
  | "deleted"
  | "deactivated"
  | "read only";

export interface ZoneMeta {
  step: number;
  custom_certificate_quota: number;
  page_rule_quota: number;
  phishing_detected: boolean;
  multiple_railguns_allowed: boolean;
}

export interface ZoneOwner {
  id: string | null;
  type: string;
  email: string | null;
}

export interface ZoneAccount {
  id: string;
  name: string;
}

export interface ZonePlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  frequency: string;
  is_subscribed: boolean;
  can_subscribe: boolean;
  legacy_id: string;
  legacy_discount: boolean;
  externally_managed: boolean;
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
  | "SOA"
  | "SPF"
  | "CERT"
  | "DNSKEY"
  | "DS"
  | "NAPTR"
  | "SMIMEA"
  | "SSHFP"
  | "SVCB"
  | "TLSA"
  | "URI"
  | "HTTPS";

export interface DNSRecord {
  id: string;
  zone_id: string;
  zone_name: string;
  name: string;
  type: DNSRecordType;
  content: string;
  proxiable: boolean;
  proxied: boolean;
  ttl: number;
  locked: boolean;
  meta: DNSRecordMeta;
  comment: string | null;
  tags: string[];
  created_on: string;
  modified_on: string;
  // MX-specific
  priority?: number;
  // SRV-specific
  data?: SRVData | CAAData | Record<string, unknown>;
}

export interface DNSRecordMeta {
  auto_added: boolean;
  managed_by_apps: boolean;
  managed_by_argo_tunnel: boolean;
  source?: string;
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
  content: string;
  ttl?: number;
  proxied?: boolean;
  priority?: number;
  comment?: string;
  tags?: string[];
  // For SRV records
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
  plan: string;
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
