// Set test environment variables before any imports
process.env.JWT_SECRET = "test-secret-for-vitest-do-not-use-in-production";
(process.env as Record<string, string>).NODE_ENV = "test";
