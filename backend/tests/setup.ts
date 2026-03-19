// Set test environment variables before any imports
process.env["JWT_SECRET"] = "test-secret-for-vitest-do-not-use-in-production";
process.env["DATABASE_URL"] = "postgresql://test:test@localhost:5432/test_db";
process.env["NODE_ENV"] = "test";

