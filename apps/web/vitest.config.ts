import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // `server-only` throws outside a React Server environment; tests run in plain Node.
      "server-only": fileURLToPath(new URL("./lib/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    include: ["lib/**/*.test.{ts,tsx}"],
  },
});
