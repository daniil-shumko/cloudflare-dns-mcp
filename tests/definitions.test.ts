/**
 * Tests for tool definitions
 */

import { describe, it, expect } from "vitest";
import { TOOLS } from "../src/tools/definitions.js";

describe("TOOLS definitions", () => {
  it("exports 10 tools", () => {
    expect(TOOLS).toHaveLength(10);
  });

  it("all tools have required properties", () => {
    for (const tool of TOOLS) {
      expect(tool.name).toBeDefined();
      expect(typeof tool.name).toBe("string");
      expect(tool.description).toBeDefined();
      expect(typeof tool.description).toBe("string");
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.annotations).toBeDefined();
    }
  });

  it("all tools have unique names", () => {
    const names = TOOLS.map((t) => t.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it("expected tools are present", () => {
    const expectedTools = [
      "add_zone",
      "list_zones",
      "get_zone_details",
      "list_dns_records",
      "get_dns_record",
      "create_dns_record",
      "update_dns_record",
      "delete_dns_record",
      "find_dns_records",
      "backup_dns_records",
    ];

    const actualNames = TOOLS.map((t) => t.name);
    for (const expected of expectedTools) {
      expect(actualNames).toContain(expected);
    }
  });

  describe("annotations", () => {
    it("read-only tools are marked correctly", () => {
      const readOnlyTools = [
        "list_zones",
        "get_zone_details",
        "list_dns_records",
        "get_dns_record",
        "find_dns_records",
        "backup_dns_records",
      ];

      for (const name of readOnlyTools) {
        const tool = TOOLS.find((t) => t.name === name);
        expect(tool?.annotations.readOnlyHint).toBe(true);
        expect(tool?.annotations.destructiveHint).toBe(false);
      }
    });

    it("destructive tools are marked correctly", () => {
      const destructiveTools = ["add_zone", "update_dns_record", "delete_dns_record"];

      for (const name of destructiveTools) {
        const tool = TOOLS.find((t) => t.name === name);
        expect(tool?.annotations.destructiveHint).toBe(true);
      }
    });

    it("create_dns_record is not marked destructive", () => {
      const tool = TOOLS.find((t) => t.name === "create_dns_record");
      expect(tool?.annotations.destructiveHint).toBe(false);
    });
  });

  describe("input schemas", () => {
    it("required fields are specified", () => {
      const addZone = TOOLS.find((t) => t.name === "add_zone");
      expect(addZone?.inputSchema.required).toContain("name");
      expect(addZone?.inputSchema.required).toContain("account_id");

      const getDns = TOOLS.find((t) => t.name === "get_dns_record");
      expect(getDns?.inputSchema.required).toContain("zone_id");
      expect(getDns?.inputSchema.required).toContain("record_id");
    });

    it("DNS record types have enum constraints", () => {
      const createRecord = TOOLS.find((t) => t.name === "create_dns_record");
      const typeProperty = createRecord?.inputSchema.properties?.type as {
        enum?: string[];
      };
      expect(typeProperty?.enum).toContain("A");
      expect(typeProperty?.enum).toContain("CNAME");
      expect(typeProperty?.enum).toContain("TXT");
    });
  });
});
