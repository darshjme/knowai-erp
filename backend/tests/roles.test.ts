import { describe, it, expect } from "vitest";
import {
  hasPermission,
  hasPageAccess,
  isSenior,
  getRoleContext,
  ROLE_PERMISSIONS,
  ROLE_SIDEBAR_ACCESS,
} from "@/lib/roles";

describe("Role Permissions", () => {
  it("CEO should have full access", () => {
    expect(hasPermission("CEO", "all:read")).toBe(true);
    expect(hasPermission("CEO", "all:write")).toBe(true);
    expect(hasPermission("CEO", "payroll:manage")).toBe(true);
  });

  it("JR_DEVELOPER should only have own tasks", () => {
    expect(hasPermission("JR_DEVELOPER", "tasks:own")).toBe(true);
    expect(hasPermission("JR_DEVELOPER", "payroll:manage")).toBe(false);
    expect(hasPermission("JR_DEVELOPER", "all:write")).toBe(false);
  });

  it("HR should manage users and payroll", () => {
    expect(hasPermission("HR", "users:manage")).toBe(true);
    expect(hasPermission("HR", "payroll:manage")).toBe(true);
    expect(hasPermission("HR", "hiring:manage")).toBe(true);
  });

  it("unknown role returns no permissions", () => {
    expect(hasPermission("UNKNOWN_ROLE", "anything")).toBe(false);
  });

  it("all:read grants any :read permission", () => {
    expect(hasPermission("CEO", "expenses:read")).toBe(true);
    expect(hasPermission("CEO", "custom:read")).toBe(true);
  });
});

describe("Sidebar Access", () => {
  it("CEO has full sidebar access (null)", () => {
    expect(ROLE_SIDEBAR_ACCESS["CEO"]).toBeNull();
    expect(hasPageAccess("CEO", "anything")).toBe(true);
  });

  it("JR_DEVELOPER can access tasks but not payroll", () => {
    expect(hasPageAccess("JR_DEVELOPER", "tasks")).toBe(true);
    expect(hasPageAccess("JR_DEVELOPER", "payroll")).toBe(false);
  });

  it("HR can access hiring and payroll", () => {
    expect(hasPageAccess("HR", "hiring")).toBe(true);
    expect(hasPageAccess("HR", "payroll")).toBe(true);
  });
});

describe("isSenior", () => {
  it("identifies C-level and senior roles", () => {
    expect(isSenior("CEO")).toBe(true);
    expect(isSenior("CTO")).toBe(true);
    expect(isSenior("CFO")).toBe(true);
    expect(isSenior("ADMIN")).toBe(true);
    expect(isSenior("SR_DEVELOPER")).toBe(true);
  });

  it("identifies non-senior roles", () => {
    expect(isSenior("JR_DEVELOPER")).toBe(false);
    expect(isSenior("GUY")).toBe(false);
    expect(isSenior("OFFICE_BOY")).toBe(false);
  });
});

describe("getRoleContext", () => {
  it("returns complete context for login response", () => {
    const ctx = getRoleContext("HR");
    expect(ctx.permissions).toBeInstanceOf(Array);
    expect(ctx.permissions.length).toBeGreaterThan(0);
    expect(ctx.sidebarAccess).toBeInstanceOf(Array);
    expect(ctx.dashboardWidgets).toBeDefined();
  });

  it("returns null sidebar/widgets for full-access roles", () => {
    const ctx = getRoleContext("CEO");
    expect(ctx.sidebarAccess).toBeNull();
    expect(ctx.dashboardWidgets).toBeNull();
  });
});

describe("All roles have definitions", () => {
  const allRoles = Object.keys(ROLE_PERMISSIONS);

  it("every role in ROLE_PERMISSIONS has sidebar access defined", () => {
    for (const role of allRoles) {
      expect(
        ROLE_SIDEBAR_ACCESS[role] !== undefined,
        `Missing sidebar access for role: ${role}`
      ).toBe(true);
    }
  });
});
