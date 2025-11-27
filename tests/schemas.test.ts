/**
 * Tests for Zod validation schemas
 */

import { describe, it, expect } from "vitest";
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
} from "../src/tools/schemas.js";

describe("AddZoneSchema", () => {
  it("accepts valid input with required fields", () => {
    const result = AddZoneSchema.safeParse({
      name: "example.com",
      account_id: "abc123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("example.com");
      expect(result.data.type).toBe("full"); // default
      expect(result.data.jump_start).toBe(false); // default
    }
  });

  it("accepts all optional fields", () => {
    const result = AddZoneSchema.safeParse({
      name: "example.com",
      account_id: "abc123",
      type: "partial",
      jump_start: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("partial");
      expect(result.data.jump_start).toBe(true);
    }
  });

  it("rejects invalid zone type", () => {
    const result = AddZoneSchema.safeParse({
      name: "example.com",
      account_id: "abc123",
      type: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    expect(AddZoneSchema.safeParse({}).success).toBe(false);
    expect(AddZoneSchema.safeParse({ name: "example.com" }).success).toBe(false);
    expect(AddZoneSchema.safeParse({ account_id: "abc" }).success).toBe(false);
  });
});

describe("ListZonesSchema", () => {
  it("accepts empty input with defaults", () => {
    const result = ListZonesSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.per_page).toBe(50);
    }
  });

  it("accepts valid status filter", () => {
    const result = ListZonesSchema.safeParse({ status: "active" });
    expect(result.success).toBe(true);
  });

  it("rejects per_page over 50", () => {
    const result = ListZonesSchema.safeParse({ per_page: 100 });
    expect(result.success).toBe(false);
  });
});

describe("GetZoneSchema", () => {
  it("accepts zone_id", () => {
    const result = GetZoneSchema.safeParse({ zone_id: "abc123" });
    expect(result.success).toBe(true);
  });

  it("accepts domain_name", () => {
    const result = GetZoneSchema.safeParse({ domain_name: "example.com" });
    expect(result.success).toBe(true);
  });

  it("accepts both zone_id and domain_name", () => {
    const result = GetZoneSchema.safeParse({
      zone_id: "abc123",
      domain_name: "example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when neither zone_id nor domain_name provided", () => {
    const result = GetZoneSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("ListDNSRecordsSchema", () => {
  it("requires zone_id or domain_name", () => {
    expect(ListDNSRecordsSchema.safeParse({}).success).toBe(false);
    expect(ListDNSRecordsSchema.safeParse({ zone_id: "abc" }).success).toBe(
      true
    );
    expect(
      ListDNSRecordsSchema.safeParse({ domain_name: "example.com" }).success
    ).toBe(true);
  });

  it("accepts valid record types", () => {
    const validTypes = [
      "A",
      "AAAA",
      "CNAME",
      "TXT",
      "MX",
      "NS",
      "SRV",
      "CAA",
      "PTR",
    ];
    for (const type of validTypes) {
      const result = ListDNSRecordsSchema.safeParse({ zone_id: "abc", type });
      expect(result.success).toBe(true);
    }
  });

  it("rejects per_page over 100", () => {
    const result = ListDNSRecordsSchema.safeParse({
      zone_id: "abc",
      per_page: 200,
    });
    expect(result.success).toBe(false);
  });
});

describe("GetDNSRecordSchema", () => {
  it("requires both zone_id and record_id", () => {
    expect(GetDNSRecordSchema.safeParse({}).success).toBe(false);
    expect(GetDNSRecordSchema.safeParse({ zone_id: "abc" }).success).toBe(false);
    expect(GetDNSRecordSchema.safeParse({ record_id: "xyz" }).success).toBe(
      false
    );
    expect(
      GetDNSRecordSchema.safeParse({ zone_id: "abc", record_id: "xyz" }).success
    ).toBe(true);
  });
});

describe("CreateDNSRecordSchema", () => {
  it("accepts valid A record", () => {
    const result = CreateDNSRecordSchema.safeParse({
      zone_id: "abc123",
      type: "A",
      name: "www",
      content: "192.168.1.1",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ttl).toBe(1); // auto
      expect(result.data.proxied).toBe(false);
    }
  });

  it("accepts MX record with priority", () => {
    const result = CreateDNSRecordSchema.safeParse({
      domain_name: "example.com",
      type: "MX",
      name: "@",
      content: "mail.example.com",
      priority: 10,
    });
    expect(result.success).toBe(true);
  });

  it("rejects TTL over max", () => {
    const result = CreateDNSRecordSchema.safeParse({
      zone_id: "abc",
      type: "A",
      name: "www",
      content: "1.2.3.4",
      ttl: 100000,
    });
    expect(result.success).toBe(false);
  });

  it("requires zone_id or domain_name", () => {
    const result = CreateDNSRecordSchema.safeParse({
      type: "A",
      name: "www",
      content: "1.2.3.4",
    });
    expect(result.success).toBe(false);
  });
});

describe("UpdateDNSRecordSchema", () => {
  it("requires zone_id and record_id", () => {
    expect(
      UpdateDNSRecordSchema.safeParse({
        zone_id: "abc",
        record_id: "xyz",
      }).success
    ).toBe(true);
  });

  it("accepts partial updates", () => {
    const result = UpdateDNSRecordSchema.safeParse({
      zone_id: "abc",
      record_id: "xyz",
      content: "new-value",
    });
    expect(result.success).toBe(true);
  });
});

describe("DeleteDNSRecordSchema", () => {
  it("requires both zone_id and record_id", () => {
    expect(
      DeleteDNSRecordSchema.safeParse({
        zone_id: "abc",
        record_id: "xyz",
      }).success
    ).toBe(true);
    expect(DeleteDNSRecordSchema.safeParse({ zone_id: "abc" }).success).toBe(
      false
    );
  });
});

describe("FindDNSRecordsSchema", () => {
  it("requires record_name and zone_id or domain_name", () => {
    expect(
      FindDNSRecordsSchema.safeParse({
        zone_id: "abc",
        record_name: "www.example.com",
      }).success
    ).toBe(true);
    expect(
      FindDNSRecordsSchema.safeParse({
        domain_name: "example.com",
        record_name: "www.example.com",
      }).success
    ).toBe(true);
    expect(
      FindDNSRecordsSchema.safeParse({
        record_name: "www.example.com",
      }).success
    ).toBe(false);
  });
});

describe("BackupDNSRecordsSchema", () => {
  it("accepts empty input (backup all)", () => {
    const result = BackupDNSRecordsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts zone_id", () => {
    const result = BackupDNSRecordsSchema.safeParse({ zone_id: "abc" });
    expect(result.success).toBe(true);
  });

  it("accepts domain_name", () => {
    const result = BackupDNSRecordsSchema.safeParse({
      domain_name: "example.com",
    });
    expect(result.success).toBe(true);
  });
});
