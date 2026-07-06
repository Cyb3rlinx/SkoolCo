import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

/**
 * Integration tests — they hit a REAL Postgres (DATABASE_URL required) and
 * exercise the route handlers end to end. Run with: npm run test:integration
 * (after `prisma migrate deploy` against the test database).
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    // DB tests share state; run serially to stay deterministic.
    fileParallelism: false,
    testTimeout: 30_000,
  },
  resolve: { alias: { "@": resolve(__dirname, "src") } },
});
