import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("dotenv/config", () => ({}));

describe("calc-insurance", () => {
  const ORIGINAL_ARGV = [...process.argv];
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    exitSpy = vi.spyOn(process, "exit").mockReturnValue(undefined as never);
  });

  afterEach(() => {
    process.argv = ORIGINAL_ARGV;
  });

  describe("standard salary: 3,000,000원", () => {
    it("calculates all 4 insurance premiums correctly", async () => {
      process.argv = ["node", "test", "--salary", "3000000"];
      await import("../calc-insurance.js");

      expect(logSpy).toHaveBeenCalled();
      const result = JSON.parse(logSpy.mock.calls[0][0]);

      expect(result.salary).toBe(3_000_000);

      // Employee portion
      const emp = result.employee;
      // 국민연금: 3,000,000 × 4.75% = 142,500
      expect(emp.pension).toBe(142_500);
      // 건강보험: 3,000,000 × 3.595% = 107,850
      expect(emp.health).toBe(107_850);
      // 장기요양: 107,850 × 13.14% = 14,171 (rounded)
      expect(emp.longTermCare).toBe(14_171);
      // 고용보험: 3,000,000 × 0.9% = 27,000
      expect(emp.employment).toBe(27_000);

      expect(emp.total).toBe(emp.pension + emp.health + emp.longTermCare + emp.employment);

      // Employer portion should be the same
      const er = result.employer;
      expect(er.pension).toBe(emp.pension);
      expect(er.health).toBe(emp.health);
      expect(er.longTermCare).toBe(emp.longTermCare);
      expect(er.employment).toBe(emp.employment);

      // Grand total = employee + employer
      expect(result.grandTotal).toBe(emp.total + er.total);
    });
  });

  describe("pension lower bound: salary below 370,000원", () => {
    it("uses minimum pension base of 370,000원", async () => {
      process.argv = ["node", "test", "--salary", "200000"];
      await import("../calc-insurance.js");

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      const emp = result.employee;

      // Pension base clamped to 370,000
      // 370,000 × 4.75% = 17,575
      expect(emp.pension).toBe(17_575);

      // Other insurances use actual salary
      // 건강보험: 200,000 × 3.595% = 7,190
      expect(emp.health).toBe(7_190);
      // 고용보험: 200,000 × 0.9% = 1,800
      expect(emp.employment).toBe(1_800);
    });
  });

  describe("pension upper bound: salary above 6,170,000원", () => {
    it("uses maximum pension base of 6,170,000원", async () => {
      process.argv = ["node", "test", "--salary", "10000000"];
      await import("../calc-insurance.js");

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      const emp = result.employee;

      // Pension base clamped to 6,170,000
      // 6,170,000 × 4.75% = 293,075
      expect(emp.pension).toBe(293_075);

      // Other insurances use actual salary 10,000,000
      // 건강보험: 10,000,000 × 3.595% = 359,500
      expect(emp.health).toBe(359_500);
      // 고용보험: 10,000,000 × 0.9% = 90,000
      expect(emp.employment).toBe(90_000);
    });
  });

  describe("formatting", () => {
    it("includes Korean labels with 원 suffix", async () => {
      process.argv = ["node", "test", "--salary", "3000000"];
      await import("../calc-insurance.js");

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      expect(result.월보수액).toMatch(/원$/);
      expect(result.근로자부담.국민연금).toMatch(/원$/);
      expect(result.근로자부담.건강보험).toMatch(/원$/);
      expect(result.근로자부담.장기요양보험).toMatch(/원$/);
      expect(result.근로자부담.고용보험).toMatch(/원$/);
      expect(result.근로자부담.합계).toMatch(/원$/);
      expect(result.사업주부담.합계).toMatch(/원$/);
      expect(result.총합계).toMatch(/원$/);
    });
  });

  describe("symmetry: employee and employer portions equal", () => {
    it("has equal portions for 5M salary", async () => {
      process.argv = ["node", "test", "--salary", "5000000"];
      await import("../calc-insurance.js");

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      expect(result.employee.pension).toBe(result.employer.pension);
      expect(result.employee.health).toBe(result.employer.health);
      expect(result.employee.longTermCare).toBe(result.employer.longTermCare);
      expect(result.employee.employment).toBe(result.employer.employment);
      expect(result.employee.total).toBe(result.employer.total);
    });
  });

  describe("CLI: missing salary", () => {
    it("shows usage and exits with code 1", async () => {
      process.argv = ["node", "test"];
      await import("../calc-insurance.js");

      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("CLI: zero salary", () => {
    it("shows usage and exits with code 1", async () => {
      process.argv = ["node", "test", "--salary", "0"];
      await import("../calc-insurance.js");

      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
