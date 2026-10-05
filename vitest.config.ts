import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "~": path.resolve(import.meta.dirname, "app"),
      "@server": path.resolve(import.meta.dirname, "server"),
    },
  },
  test: { include: ["tests/unit/**/*.test.ts"] },
});
