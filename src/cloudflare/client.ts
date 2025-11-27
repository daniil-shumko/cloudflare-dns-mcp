/**
 * Cloudflare API Client
 * Handles all HTTP communication with Cloudflare API v4
 */

import type {
  CloudflareResponse,
  Zone,
  DNSRecord,
  ListZonesParams,
  ListDNSRecordsParams,
  CreateDNSRecordInput,
  UpdateDNSRecordInput,
  DeleteResult,
} from "./types.js";

export class CloudflareAPIError extends Error {
  public readonly errors: Array<{ code: number; message: string }>;
  public readonly statusCode?: number;

  constructor(
    errors: Array<{ code: number; message: string }>,
    statusCode?: number
  ) {
    const message = errors.map((e) => `[${e.code}] ${e.message}`).join("; ");
    super(message);
    this.name = "CloudflareAPIError";
    this.errors = errors;
    this.statusCode = statusCode;
  }
}

export class CloudflareClient {
  private readonly baseUrl = "https://api.cloudflare.com/client/v4";
  private readonly apiToken: string;

  constructor(apiToken: string) {
    if (!apiToken) {
      throw new Error("Cloudflare API token is required");
    }
    this.apiToken = apiToken;
  }

  /**
   * Make an authenticated request to the Cloudflare API
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): Promise<CloudflareResponse<T>> {
    // Build URL with query parameters
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = (await response.json()) as CloudflareResponse<T>;

    if (!data.success) {
      throw new CloudflareAPIError(data.errors, response.status);
    }

    return data;
  }

  // ==================== Zone Methods ====================

  /**
   * List all zones (domains) in the account
   */
  async listZones(
    params?: ListZonesParams
  ): Promise<CloudflareResponse<Zone[]>> {
    return this.request<Zone[]>("GET", "/zones", undefined, {
      name: params?.name,
      status: params?.status,
      "account.id": params?.account_id,
      "account.name": params?.account_name,
      page: params?.page,
      per_page: params?.per_page,
      order: params?.order,
      direction: params?.direction,
      match: params?.match,
    });
  }

  /**
   * Get details for a specific zone by ID
   */
  async getZone(zoneId: string): Promise<CloudflareResponse<Zone>> {
    return this.request<Zone>("GET", `/zones/${zoneId}`);
  }

  /**
   * Create a new zone (add a domain to Cloudflare)
   */
  async createZone(
    name: string,
    accountId: string,
    options?: { type?: "full" | "partial" | "secondary"; jump_start?: boolean }
  ): Promise<CloudflareResponse<Zone>> {
    return this.request<Zone>("POST", "/zones", {
      name,
      account: { id: accountId },
      type: options?.type ?? "full",
      jump_start: options?.jump_start ?? false,
    });
  }

  /**
   * Find a zone by its domain name
   * Returns null if not found
   */
  async getZoneByName(name: string): Promise<Zone | null> {
    const response = await this.listZones({ name, per_page: 1 });
    if (response.result.length === 0) {
      return null;
    }
    // Exact match check (API does partial matching)
    const exactMatch = response.result.find(
      (z) => z.name.toLowerCase() === name.toLowerCase()
    );
    return exactMatch || null;
  }

  /**
   * Resolve a zone identifier (either zone_id or domain name) to a zone_id
   */
  async resolveZoneId(zoneIdOrName: string): Promise<string> {
    // If it looks like a zone ID (32 hex chars), use it directly
    if (/^[a-f0-9]{32}$/i.test(zoneIdOrName)) {
      return zoneIdOrName;
    }

    // Otherwise, treat it as a domain name
    const zone = await this.getZoneByName(zoneIdOrName);
    if (!zone) {
      throw new CloudflareAPIError([
        {
          code: 1000,
          message: `Zone not found for domain: ${zoneIdOrName}`,
        },
      ]);
    }
    return zone.id;
  }

  // ==================== DNS Record Methods ====================

  /**
   * List all DNS records for a zone
   */
  async listDNSRecords(
    zoneId: string,
    params?: ListDNSRecordsParams
  ): Promise<CloudflareResponse<DNSRecord[]>> {
    return this.request<DNSRecord[]>(
      "GET",
      `/zones/${zoneId}/dns_records`,
      undefined,
      {
        type: params?.type,
        name: params?.name,
        content: params?.content,
        page: params?.page,
        per_page: params?.per_page,
        order: params?.order,
        direction: params?.direction,
        match: params?.match,
        tag: params?.tag,
        "tag-match": params?.tag_match,
        search: params?.search,
        comment: params?.comment,
      }
    );
  }

  /**
   * Get a specific DNS record by ID
   */
  async getDNSRecord(
    zoneId: string,
    recordId: string
  ): Promise<CloudflareResponse<DNSRecord>> {
    return this.request<DNSRecord>(
      "GET",
      `/zones/${zoneId}/dns_records/${recordId}`
    );
  }

  /**
   * Create a new DNS record
   */
  async createDNSRecord(
    zoneId: string,
    record: CreateDNSRecordInput
  ): Promise<CloudflareResponse<DNSRecord>> {
    // Set default TTL to automatic (1) if not specified
    const payload = {
      ...record,
      ttl: record.ttl ?? 1,
    };

    return this.request<DNSRecord>(
      "POST",
      `/zones/${zoneId}/dns_records`,
      payload
    );
  }

  /**
   * Update an existing DNS record (partial update)
   */
  async updateDNSRecord(
    zoneId: string,
    recordId: string,
    record: UpdateDNSRecordInput
  ): Promise<CloudflareResponse<DNSRecord>> {
    return this.request<DNSRecord>(
      "PATCH",
      `/zones/${zoneId}/dns_records/${recordId}`,
      record
    );
  }

  /**
   * Overwrite an existing DNS record (full replacement)
   */
  async overwriteDNSRecord(
    zoneId: string,
    recordId: string,
    record: CreateDNSRecordInput
  ): Promise<CloudflareResponse<DNSRecord>> {
    return this.request<DNSRecord>(
      "PUT",
      `/zones/${zoneId}/dns_records/${recordId}`,
      record
    );
  }

  /**
   * Delete a DNS record
   */
  async deleteDNSRecord(
    zoneId: string,
    recordId: string
  ): Promise<CloudflareResponse<DeleteResult>> {
    return this.request<DeleteResult>(
      "DELETE",
      `/zones/${zoneId}/dns_records/${recordId}`
    );
  }

  /**
   * Find DNS records by name within a zone
   * Useful for finding a record to update/delete by name instead of ID
   */
  async findDNSRecordsByName(
    zoneId: string,
    recordName: string,
    recordType?: string
  ): Promise<DNSRecord[]> {
    const params: ListDNSRecordsParams = {
      name: recordName,
      per_page: 100,
    };
    if (recordType) {
      params.type = recordType as ListDNSRecordsParams["type"];
    }

    const response = await this.listDNSRecords(zoneId, params);
    return response.result;
  }

  // ==================== Utility Methods ====================

  /**
   * Verify the API token is valid by making a test request
   */
  async verifyToken(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/user/tokens/verify`,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = (await response.json()) as CloudflareResponse<{ status: string }>;
      return data.success;
    } catch {
      return false;
    }
  }
}
