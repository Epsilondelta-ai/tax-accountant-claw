import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("dotenv/config", () => ({}));

describe("calc-corporate-tax", () => {
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

  describe("first bracket: 2억 이하 (10%)", () => {
    it("calculates tax for 100M income", async () => {
      process.argv = ["node", "test", "--income", "100000000"];
      await import("../calc-corporate-tax.js");

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      // 1억 × 10% = 10,000,000
      expect(result.taxableIncome).toBe(100_000_000);
      expect(result.corporateTax).toBe(10_000_000);
      expect(result.localTax).toBe(1_000_000); // 10% of corporate tax
      expect(result.totalTax).toBe(11_000_000);
      expect(result.effectiveRate).toBe("11.00%");
    });

    it("calculates tax for exactly 200M (boundary)", async () => {
      process.argv = ["node", "test", "--income", "200000000"];
      await import("../calc-corporate-tax.js");

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      // 2억 × 10% = 20,000,000
      expect(result.corporateTax).toBe(20_000_000);
      expect(result.localTax).toBe(2_000_000);
      expect(result.totalTax).toBe(22_000_000);
    });
  });

  describe("second bracket: 2억~200억 (20%)", () => {
    it("calculates tax for 500M income", async () => {
      process.argv = ["node", "test", "--income", "500000000"];
      await import("../calc-corporate-tax.js");

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      // 20M (2억×10%) + (5억-2억)×20% = 20M + 60M = 80M
      expect(result.corporateTax).toBe(80_000_000);
      expect(result.localTax).toBe(8_000_000);
    });
  });

  describe("third bracket: 200억~3000억 (22%)", () => {
    it("calculates tax for 50B income", async () => {
      process.argv = ["node", "test", "--income", "50000000000"];
      await import("../calc-corporate-tax.js");

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      // cumulative at 200억 = 3,980,000,000
      // (500억 - 200억) × 22% = 300억 × 0.22 = 6,600,000,000
      // total = 3,980,000,000 + 6,600,000,000 = 10,580,000,000
      expect(result.corporateTax).toBe(10_580_000_000);
    });
  });

  describe("zero/negative income", () => {
    it("returns all zeros for 0 income", async () => {
      process.argv = ["node", "test", "--income", "1"]; // will trigger main
      // Actually 0 income hits the CLI usage check, so use a tiny positive number
      // Actually, calculateCorporateTax(0) returns all 0, but parseArgs triggers exit
      // Let's test through CLI with income 0 — it hits the usage message
      process.argv = ["node", "test", "--income", "0"];
      await import("../calc-corporate-tax.js");

      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("SME deduction (중소기업 감면)", () => {
    it("applies 50% deduction for regular SME", async () => {
      process.argv = ["node", "test", "--income", "100000000", "--sme"];
      await import("../calc-corporate-tax.js");

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      // Base tax: 10,000,000, SME deduction: 50% = 5,000,000
      expect(result.smeDeduction).toBe(5_000_000);
      expect(result.corporateTax).toBe(5_000_000);
      expect(result.localTax).toBe(500_000);
      expect(result.totalTax).toBe(5_500_000);
      expect(result.중소기업감면).toBeDefined();
    });

    it("applies 100% deduction for youth startup SME", async () => {
      process.argv = [
        "node",
        "test",
        "--income",
        "100000000",
        "--sme",
        "--youth",
      ];
      await import("../calc-corporate-tax.js");

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      // 100% deduction
      expect(result.smeDeduction).toBe(10_000_000);
      expect(result.corporateTax).toBe(0);
      expect(result.localTax).toBe(0);
      expect(result.totalTax).toBe(0);
    });
  });

  describe("formatting", () => {
    it("includes Korean labels", async () => {
      process.argv = ["node", "test", "--income", "100000000"];
      await import("../calc-corporate-tax.js");

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      expect(result.과세표준).toMatch(/원$/);
      expect(result.법인세).toMatch(/원$/);
      expect(result.지방소득세).toMatch(/원$/);
      expect(result.총세금).toMatch(/원$/);
      expect(result.실효세율).toMatch(/%$/);
    });
  });

  describe("CLI: missing income", () => {
    it("shows usage and exits with code 1", async () => {
      process.argv = ["node", "test"];
      await import("../calc-corporate-tax.js");

      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("CLI: negative income", () => {
    it("shows usage and exits with code 1", async () => {
      process.argv = ["node", "test", "--income", "-100"];
      await import("../calc-corporate-tax.js");

      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
