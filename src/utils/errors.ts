/**
 * Error handling utilities for MCP tool responses
 */

import { CloudflareAPIError } from "../cloudflare/client.js";

export interface ToolErrorResponse {
  error: true;
  code: string;
  message: string;
  details?: string;
  suggestion?: string;
  /** Cloudflare's link for the error (e.g. which permission a 403 needs). */
  documentation_url?: string;
}

/**
 * Format an error for MCP tool response
 */
export function formatError(error: unknown): ToolErrorResponse {
  if (error instanceof CloudflareAPIError) {
    const documentationUrl = error.errors.find(
      (e) => e.documentation_url
    )?.documentation_url;
    return {
      error: true,
      code: `CF_${error.errors[0]?.code || "UNKNOWN"}`,
      message: error.message,
      details: error.errors.length > 1
        ? error.errors.map((e) => `[${e.code}] ${e.message}`).join("\n")
        : undefined,
      suggestion: getSuggestionForError(error),
      ...(documentationUrl && { documentation_url: documentationUrl }),
    };
  }

  if (error instanceof Error) {
    return {
      error: true,
      code: "INTERNAL_ERROR",
      message: error.message,
    };
  }

  return {
    error: true,
    code: "UNKNOWN_ERROR",
    message: String(error),
  };
}

/**
 * Get helpful suggestions based on error type
 */
function getSuggestionForError(error: CloudflareAPIError): string | undefined {
  const errorCode = error.errors[0]?.code;
  const errorMessage = error.errors[0]?.message?.toLowerCase() || "";

  // Rate limiting — checked first because the HTTP status is unambiguous
  // while error codes (e.g. 10000) overlap with authentication failures.
  if (error.statusCode === 429) {
    return error.retryAfter !== undefined
      ? `Rate limit exceeded. Retry after ${error.retryAfter} second(s).`
      : "Rate limit exceeded. Wait a moment before making more requests.";
  }

  // A valid token without permission for this zone/resource: Cloudflare
  // answers 403 with code 10000 ("Authentication error"), whereas an invalid
  // token gets 401/10000, 403/9109 ("Invalid access token") or 400/6003.
  // Common with account-owned tokens scoped to specific zones.
  if (error.statusCode === 403 && errorCode === 10000) {
    return "Your CLOUDFLARE_API_TOKEN is valid but not permitted to access this resource. Check that the token's zone resources include this zone and that it has Zone.DNS:Read (or Edit; Zone.Zone:Edit for add_zone).";
  }

  // Authentication / token problems (6003 = invalid request headers,
  // 9109/10000 = authentication errors)
  if (
    errorCode === 6003 ||
    errorCode === 9109 ||
    errorCode === 10000 ||
    errorMessage.includes("invalid api token") ||
    errorMessage.includes("authentication")
  ) {
    return "Check that your CLOUDFLARE_API_TOKEN is correct, active, and has not expired.";
  }

  // Insufficient permissions
  if (errorCode === 6111 || errorMessage.includes("permission")) {
    return "Your API token may not have the required permissions. Ensure it has Zone.Zone:Read and Zone.DNS:Edit (plus Zone.Zone:Edit for add_zone).";
  }

  // Resource not found
  if (
    errorMessage.includes("not found") ||
    errorMessage.includes("does not exist")
  ) {
    return "The requested resource was not found. Use list_zones, list_dns_records, or find_dns_records to look up valid IDs.";
  }

  // No route for the requested URI — usually a malformed zone_id / record_id
  if (errorCode === 7000 || errorCode === 7003) {
    return "No route for the requested URI. Double-check that the zone_id and record_id are valid.";
  }

  // CNAME cannot coexist with other records on the same name (81053)
  if (
    errorCode === 81053 ||
    (errorMessage.includes("cname") && errorMessage.includes("exist"))
  ) {
    return "A CNAME cannot coexist with other records on the same name. Remove the conflicting record(s) first.";
  }

  // Duplicate / identical record (81057 = record already exists,
  // 81058 = an identical record already exists)
  if (
    errorCode === 81057 ||
    errorCode === 81058 ||
    errorMessage.includes("already exists")
  ) {
    return "A record with this name and type already exists. Use update_dns_record instead, or change the content.";
  }

  return undefined;
}

/**
 * Format a successful result for consistent MCP output
 */
export function formatSuccess<T>(data: T, message?: string): {
  success: true;
  message?: string;
  data: T;
} {
  return {
    success: true,
    ...(message && { message }),
    data,
  };
}
