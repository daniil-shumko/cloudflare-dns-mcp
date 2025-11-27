/**
 * Tests for pagination limits and type constants
 */

import { describe, it, expect } from "vitest";
import { PAGINATION_LIMITS } from "../src/tools/types.js";

describe("PAGINATION_LIMITS", () => {
  it("has reasonable zone page limits", () => {
    expect(PAGINATION_LIMITS.MAX_ZONE_PAGES).toBeGreaterThan(0);
    expect(PAGINATION_LIMITS.MAX_ZONE_PAGES).toBeLessThanOrEqual(1000);
  });

  it("has reasonable record page limits", () => {
    expect(PAGINATION_LIMITS.MAX_RECORD_PAGES).toBeGreaterThan(0);
    expect(PAGINATION_LIMITS.MAX_RECORD_PAGES).toBeLessThanOrEqual(1000);
  });

  it("has reasonable zone backup limit", () => {
    expect(PAGINATION_LIMITS.MAX_ZONES_BACKUP).toBeGreaterThan(0);
    expect(PAGINATION_LIMITS.MAX_ZONES_BACKUP).toBeLessThanOrEqual(1000);
  });

  it("has reasonable records per zone limit", () => {
    expect(PAGINATION_LIMITS.MAX_RECORDS_PER_ZONE).toBeGreaterThan(0);
    expect(PAGINATION_LIMITS.MAX_RECORDS_PER_ZONE).toBeLessThanOrEqual(50000);
  });

  it("limits are immutable (const assertion)", () => {
    // This is a compile-time check, but we can verify the values exist
    expect(typeof PAGINATION_LIMITS.MAX_ZONE_PAGES).toBe("number");
    expect(typeof PAGINATION_LIMITS.MAX_RECORD_PAGES).toBe("number");
    expect(typeof PAGINATION_LIMITS.MAX_ZONES_BACKUP).toBe("number");
    expect(typeof PAGINATION_LIMITS.MAX_RECORDS_PER_ZONE).toBe("number");
  });
});
