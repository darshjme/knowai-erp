import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "path";

export default defineConfig(({ mode }) => {
  // Load .env.test before any imports so DATABASE_URL is available at module level
  const env = loadEnv(mode || "test", process.cwd(), "");
  Object.assign(process.env, env);

  // Also set directly in case loadEnv misses dotenv files
  process.env.JWT_SECRET ??= "test-secret-for-vitest-do-not-use-in-production";
  process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test_db";
  process.env.NODE_ENV ??= "test";

  return {
    test: {
      globals: true,
      environment: "node",
      include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
      setupFiles: ["tests/setup.ts"],
      testTimeout: 10000,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  };
});
