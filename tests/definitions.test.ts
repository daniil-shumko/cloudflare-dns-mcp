/**
 * Tests for tool definitions
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { TOOLS } from "../src/tools/definitions.js";

/** The JSON Schema clients see for a tool's input (what the SDK publishes). */
function inputJsonSchema(name: string) {
  const tool = TOOLS.find((t) => t.name === name)!;
  return z.toJSONSchema(tool.inputSchema, { io: "input" }) as {
    type?: string;
    required?: string[];
    properties?: Record<string, { enum?: string[]; description?: string }>;
  };
}

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
      expect(inputJsonSchema(tool.name).type).toBe("object");
      expect(typeof tool.handler).toBe("function");
      expect(tool.annotations).toBeDefined();
    }
  });

  it("all tools have a top-level title matching annotations.title", () => {
    for (const tool of TOOLS) {
      expect(typeof tool.title).toBe("string");
      expect(tool.title.length).toBeGreaterThan(0);
      expect(tool.title).toBe(tool.annotations.title);
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
      expect(inputJsonSchema("add_zone").required).toEqual(["name", "account_id"]);
      expect(inputJsonSchema("get_dns_record").required).toEqual([
        "zone_id",
        "record_id",
      ]);
    });

    it("fields with defaults are optional for callers", () => {
      expect(inputJsonSchema("list_zones").required ?? []).toEqual([]);
      expect(inputJsonSchema("create_dns_record").required).toEqual(["type", "name"]);
    });

    it("DNS record types have enum constraints", () => {
      const typeProperty = inputJsonSchema("create_dns_record").properties?.type;
      expect(typeProperty?.enum).toContain("A");
      expect(typeProperty?.enum).toContain("CNAME");
      expect(typeProperty?.enum).toContain("TXT");
    });

    it("every input property has a description", () => {
      for (const tool of TOOLS) {
        for (const [prop, schema] of Object.entries(
          inputJsonSchema(tool.name).properties ?? {}
        )) {
          expect(schema.description, `${tool.name}.${prop}`).toBeTruthy();
        }
      }
    });
  });
});
