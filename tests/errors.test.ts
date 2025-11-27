/**
 * Tests for error formatting utilities
 */

import { describe, it, expect } from "vitest";
import { formatError, formatSuccess } from "../src/utils/errors.js";
import { CloudflareAPIError } from "../src/cloudflare/client.js";

describe("formatError", () => {
  it("formats CloudflareAPIError correctly", () => {
    const error = new CloudflareAPIError(
      [{ code: 6003, message: "Invalid API key" }],
      401
    );
    const result = formatError(error);

    expect(result.error).toBe(true);
    expect(result.code).toBe("CF_6003");
    expect(result.message).toContain("Invalid API key");
    expect(result.suggestion).toContain("CLOUDFLARE_API_TOKEN");
  });

  it("formats permission error with suggestion", () => {
    const error = new CloudflareAPIError(
      [{ code: 6111, message: "Permission denied" }],
      403
    );
    const result = formatError(error);

    expect(result.suggestion).toContain("permissions");
  });

  it("formats not found error with suggestion", () => {
    const error = new CloudflareAPIError(
      [{ code: 7000, message: "Resource not found" }],
      404
    );
    const result = formatError(error);

    expect(result.suggestion).toContain("list_zones");
  });

  it("formats already exists error with suggestion", () => {
    const error = new CloudflareAPIError(
      [{ code: 81057, message: "Record already exists" }],
      400
    );
    const result = formatError(error);

    expect(result.suggestion).toContain("update_dns_record");
  });

  it("formats rate limit error with suggestion", () => {
    const error = new CloudflareAPIError(
      [{ code: 0, message: "Rate limited" }],
      429
    );
    const result = formatError(error);

    expect(result.suggestion).toContain("Rate limit");
  });

  it("formats generic Error", () => {
    const error = new Error("Something went wrong");
    const result = formatError(error);

    expect(result.error).toBe(true);
    expect(result.code).toBe("INTERNAL_ERROR");
    expect(result.message).toBe("Something went wrong");
  });

  it("formats unknown error types", () => {
    const result = formatError("string error");

    expect(result.error).toBe(true);
    expect(result.code).toBe("UNKNOWN_ERROR");
    expect(result.message).toBe("string error");
  });

  it("handles multiple errors", () => {
    const error = new CloudflareAPIError([
      { code: 1001, message: "Error one" },
      { code: 1002, message: "Error two" },
    ]);
    const result = formatError(error);

    expect(result.details).toContain("[1001]");
    expect(result.details).toContain("[1002]");
  });
});

describe("formatSuccess", () => {
  it("formats success without message", () => {
    const data = { id: "123", name: "test" };
    const result = formatSuccess(data);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(data);
    expect(result.message).toBeUndefined();
  });

  it("formats success with message", () => {
    const data = { id: "123" };
    const result = formatSuccess(data, "Operation successful");

    expect(result.success).toBe(true);
    expect(result.data).toEqual(data);
    expect(result.message).toBe("Operation successful");
  });

  it("preserves complex data structures", () => {
    const data = {
      zones: [{ id: "1" }, { id: "2" }],
      pagination: { page: 1, total: 10 },
    };
    const result = formatSuccess(data);

    expect(result.data).toEqual(data);
  });
});
