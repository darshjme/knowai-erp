import { describe, it, expect } from "vitest";
import { createPayrollSchema, addPayrollLogSchema } from "@/schemas/payroll";
import { createExpenseSchema } from "@/schemas/expenses";
import { loginSchema } from "@/schemas/auth";
import { createTaskSchema } from "@/schemas/tasks";
import { createJobSchema } from "@/schemas/hiring";

describe("Payroll Schema", () => {
  it("accepts valid payroll", () => {
    const result = createPayrollSchema.safeParse({
      employeeId: "123e4567-e89b-12d3-a456-426614174000",
      month: 3,
      year: 2026,
      basicPay: 50000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative basicPay", () => {
    const result = createPayrollSchema.safeParse({
      employeeId: "123e4567-e89b-12d3-a456-426614174000",
      month: 3,
      year: 2026,
      basicPay: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid month", () => {
    const result = createPayrollSchema.safeParse({
      employeeId: "123e4567-e89b-12d3-a456-426614174000",
      month: 13,
      year: 2026,
      basicPay: 50000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID employeeId", () => {
    const result = createPayrollSchema.safeParse({
      employeeId: "not-a-uuid",
      month: 3,
      year: 2026,
      basicPay: 50000,
    });
    expect(result.success).toBe(false);
  });
});

describe("Payroll Log Schema", () => {
  it("accepts valid payment log", () => {
    const result = addPayrollLogSchema.safeParse({
      action: "addLog",
      payrollId: "123e4567-e89b-12d3-a456-426614174000",
      amount: 25000,
      mode: "BANK_TRANSFER",
      purpose: "salary",
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero amount", () => {
    const result = addPayrollLogSchema.safeParse({
      action: "addLog",
      payrollId: "123e4567-e89b-12d3-a456-426614174000",
      amount: 0,
      mode: "CASH",
      purpose: "salary",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid mode", () => {
    const result = addPayrollLogSchema.safeParse({
      action: "addLog",
      payrollId: "123e4567-e89b-12d3-a456-426614174000",
      amount: 25000,
      mode: "BITCOIN",
      purpose: "salary",
    });
    expect(result.success).toBe(false);
  });
});

describe("Expense Schema", () => {
  it("accepts valid expense", () => {
    const result = createExpenseSchema.safeParse({
      title: "Office supplies",
      amount: 1500,
      category: "OFFICE",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = createExpenseSchema.safeParse({
      title: "",
      amount: 1500,
      category: "OFFICE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const result = createExpenseSchema.safeParse({
      title: "Office supplies",
      amount: -500,
      category: "OFFICE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = createExpenseSchema.safeParse({
      title: "Office supplies",
      amount: 1500,
      category: "INVALID",
    });
    expect(result.success).toBe(false);
  });
});

describe("Auth Schema", () => {
  it("accepts valid login", () => {
    const result = loginSchema.safeParse({
      email: "test@knowai.club",
      password: "secret123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "secret123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "test@knowai.club",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("Task Schema", () => {
  it("accepts valid task", () => {
    const result = createTaskSchema.safeParse({
      title: "Fix login bug",
    });
    expect(result.success).toBe(true);
  });

  it("rejects title over 300 chars", () => {
    const result = createTaskSchema.safeParse({
      title: "x".repeat(301),
    });
    expect(result.success).toBe(false);
  });
});

describe("Hiring Schema", () => {
  it("accepts valid job posting", () => {
    const result = createJobSchema.safeParse({
      title: "Senior React Developer",
      department: "Engineering",
      description: "We are looking for an experienced React developer to join our team.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short description", () => {
    const result = createJobSchema.safeParse({
      title: "Developer",
      department: "Engineering",
      description: "Short",
    });
    expect(result.success).toBe(false);
  });
});
