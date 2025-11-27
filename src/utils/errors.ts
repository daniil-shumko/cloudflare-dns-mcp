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
}

/**
 * Format an error for MCP tool response
 */
export function formatError(error: unknown): ToolErrorResponse {
  if (error instanceof CloudflareAPIError) {
    return {
      error: true,
      code: `CF_${error.errors[0]?.code || "UNKNOWN"}`,
      message: error.message,
      details: error.errors.length > 1
        ? error.errors.map((e) => `[${e.code}] ${e.message}`).join("\n")
        : undefined,
      suggestion: getSuggestionForError(error),
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

  // Common Cloudflare error codes
  if (errorCode === 6003 || errorMessage.includes("invalid api key")) {
    return "Check that your CLOUDFLARE_API_TOKEN is correct and has not expired.";
  }

  if (errorCode === 6111 || errorMessage.includes("permission")) {
    return "Your API token may not have the required permissions. Ensure it has Zone.Zone:Read and Zone.DNS:Edit permissions.";
  }

  if (errorCode === 7000 || errorMessage.includes("not found")) {
    return "The requested resource was not found. Use list_zones or list_dns_records to find valid IDs.";
  }

  if (errorCode === 81057 || errorMessage.includes("already exists")) {
    return "A record with this name and type already exists. Use update_dns_record instead, or delete the existing record first.";
  }

  if (errorCode === 81058 || errorMessage.includes("cname") && errorMessage.includes("a record")) {
    return "CNAME records cannot coexist with other record types on the same name. Remove existing A/AAAA records first.";
  }

  if (error.statusCode === 429) {
    return "Rate limit exceeded. Wait a moment before making more requests.";
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
