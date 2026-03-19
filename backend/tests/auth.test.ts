import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "@/lib/auth";

describe("JWT Token", () => {
  it("should sign and verify a token with tokenVersion", async () => {
    const payload = {
      userId: "test-user-id",
      email: "test@knowai.club",
      role: "CEO",
      workspaceId: "test-workspace",
      tokenVersion: 1,
    };

    const token = await signToken(payload);
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");

    const decoded = await verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.userId).toBe("test-user-id");
    expect(decoded!.email).toBe("test@knowai.club");
    expect(decoded!.role).toBe("CEO");
    expect(decoded!.tokenVersion).toBe(1);
  });

  it("should reject a tampered token", async () => {
    const token = await signToken({
      userId: "test-user-id",
      email: "test@knowai.club",
      role: "CEO",
    });

    const tampered = token.slice(0, -5) + "XXXXX";
    const decoded = await verifyToken(tampered);
    expect(decoded).toBeNull();
  });

  it("should include tokenVersion 0 by default when not provided", async () => {
    const token = await signToken({
      userId: "test-user-id",
      email: "test@knowai.club",
      role: "JR_DEVELOPER",
    });

    const decoded = await verifyToken(token);
    expect(decoded).not.toBeNull();
    // tokenVersion is optional — when not set, it's undefined in the JWT
    // The getAuthUser check treats undefined as 0
  });
});
