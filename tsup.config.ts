import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8")
) as { version: string };

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  // Single-source the server version reported to MCP clients from package.json
  // so it can never drift from the published package version.
  define: {
    __SERVER_VERSION__: JSON.stringify(pkg.version),
  },
});
