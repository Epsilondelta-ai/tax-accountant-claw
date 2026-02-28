import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("dotenv/config", () => ({}));

// Mock ecount-client to prevent real API calls
vi.mock("../ecount-client.js", () => ({
  login: vi.fn(),
  getSalesSlips: vi.fn(),
  getPurchaseSlips: vi.fn(),
}));

describe("calc-vat", () => {
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

  describe("basic VAT calculation", () => {
    it("calculates 10% output and input tax", async () => {
      process.argv = [
        "node", "test",
        "--sales-amount", "50000000",
        "--purchase-amount", "30000000",
      ];
      await import("../calc-vat.js");
      await new Promise((r) => setTimeout(r, 50));

      expect(logSpy).toHaveBeenCalled();
      const result = JSON.parse(logSpy.mock.calls[0][0]);

      expect(result.salesAmount).toBe(50_000_000);
      expect(result.purchaseAmount).toBe(30_000_000);
      // 50M × 10% = 5M output tax
      expect(result.outputTax).toBe(5_000_000);
      // 30M × 10% = 3M input tax
      expect(result.inputTax).toBe(3_000_000);
      // payable = 5M - 3M = 2M
      expect(result.payableTax).toBe(2_000_000);
      expect(result.finalTax).toBe(2_000_000);
    });
  });

  describe("zero-rate (영세율)", () => {
    it("applies 0% output tax rate", async () => {
      process.argv = [
        "node", "test",
        "--sales-amount", "50000000",
        "--purchase-amount", "30000000",
        "--zero-rate",
      ];
      await import("../calc-vat.js");
      await new Promise((r) => setTimeout(r, 50));

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      // Zero rate: output tax = 0
      expect(result.outputTax).toBe(0);
      // Input tax still applies
      expect(result.inputTax).toBe(3_000_000);
      // payable = 0 - 3M = -3M (refund)
      expect(result.payableTax).toBe(-3_000_000);
      // final tax clamped to 0 (Math.max(0, ...))
      expect(result.finalTax).toBe(0);
    });
  });

  describe("exempt (면세)", () => {
    it("applies 0% to both output and input tax", async () => {
      process.argv = [
        "node", "test",
        "--sales-amount", "50000000",
        "--purchase-amount", "30000000",
        "--exempt",
      ];
      await import("../calc-vat.js");
      await new Promise((r) => setTimeout(r, 50));

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      expect(result.outputTax).toBe(0);
      expect(result.inputTax).toBe(0);
      expect(result.payableTax).toBe(0);
      expect(result.finalTax).toBe(0);
    });
  });

  describe("card sales deduction (신용카드매출전표 세액공제)", () => {
    it("applies 1.3% deduction for annual sales under 10억", async () => {
      process.argv = [
        "node", "test",
        "--sales-amount", "50000000",
        "--purchase-amount", "30000000",
        "--card-sales",
      ];
      await import("../calc-vat.js");
      await new Promise((r) => setTimeout(r, 50));

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      // annualSales estimate: 50M × 4 = 200M (under 10억)
      // Deduction: 50M × 1.3% = 650,000
      expect(result.deductions).toHaveLength(1);
      expect(result.deductions[0].amount).toBe(650_000);
      // final = payable (2M) - deduction (650K) = 1,350,000
      expect(result.finalTax).toBe(1_350_000);
    });

    it("respects 10M annual deduction cap", async () => {
      process.argv = [
        "node", "test",
        "--sales-amount", "900000000",
        "--purchase-amount", "500000000",
        "--card-sales",
        "--annual-sales", "900000000",
      ];
      await import("../calc-vat.js");
      await new Promise((r) => setTimeout(r, 50));

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      // 900M × 1.3% = 11,700,000 → capped at 10,000,000
      expect(result.deductions[0].amount).toBe(10_000_000);
    });

    it("skips deduction for annual sales over 10억", async () => {
      process.argv = [
        "node", "test",
        "--sales-amount", "500000000",
        "--purchase-amount", "300000000",
        "--card-sales",
        "--annual-sales", "1500000000",
      ];
      await import("../calc-vat.js");
      await new Promise((r) => setTimeout(r, 50));

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      expect(result.deductions).toHaveLength(0);
      expect(result.finalTax).toBe(result.payableTax);
    });
  });

  describe("Ecount data fetch", () => {
    it("uses Ecount API when dates provided", async () => {
      const ecountClient = await import("../ecount-client.js");
      vi.mocked(ecountClient.login).mockResolvedValue({
        sessionId: "test_sess",
        zone: "Q",
      });
      vi.mocked(ecountClient.getSalesSlips).mockResolvedValue({
        Status: "200",
        Error: null,
        Data: {
          Datas: [
            { SUPPLY_AMT: "30000000" },
            { SUPPLY_AMT: "20000000" },
          ],
          TotalCount: 2,
        },
      });
      vi.mocked(ecountClient.getPurchaseSlips).mockResolvedValue({
        Status: "200",
        Error: null,
        Data: {
          Datas: [{ SUPPLY_AMT: "15000000" }],
          TotalCount: 1,
        },
      });

      process.argv = [
        "node", "test",
        "--start-date", "2026-01-01",
        "--end-date", "2026-03-31",
      ];
      await import("../calc-vat.js");
      await new Promise((r) => setTimeout(r, 100));

      expect(logSpy).toHaveBeenCalled();
      const result = JSON.parse(logSpy.mock.calls[0][0]);
      // Sales: 30M + 20M = 50M
      expect(result.salesAmount).toBe(50_000_000);
      // Purchases: 15M
      expect(result.purchaseAmount).toBe(15_000_000);
    });

    it("handles empty Ecount data (Datas is null)", async () => {
      const ecountClient = await import("../ecount-client.js");
      vi.mocked(ecountClient.login).mockResolvedValue({
        sessionId: "test_sess",
        zone: "Q",
      });
      vi.mocked(ecountClient.getSalesSlips).mockResolvedValue({
        Status: "200",
        Error: null,
        Data: { Datas: [], TotalCount: 0 },
      });
      vi.mocked(ecountClient.getPurchaseSlips).mockResolvedValue({
        Status: "200",
        Error: null,
        Data: { Datas: [], TotalCount: 0 },
      });

      process.argv = [
        "node", "test",
        "--start-date", "2026-01-01",
        "--end-date", "2026-03-31",
      ];
      await import("../calc-vat.js");
      await new Promise((r) => setTimeout(r, 100));

      // With 0 sales and 0 purchases from Ecount, and no CLI amounts,
      // it should hit the usage error path
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("falls back to TOTAL_AMT when SUPPLY_AMT is missing", async () => {
      const ecountClient = await import("../ecount-client.js");
      vi.mocked(ecountClient.login).mockResolvedValue({
        sessionId: "test_sess",
        zone: "Q",
      });
      vi.mocked(ecountClient.getSalesSlips).mockResolvedValue({
        Status: "200",
        Error: null,
        Data: {
          Datas: [{ TOTAL_AMT: "10000000" }],
          TotalCount: 1,
        },
      });
      vi.mocked(ecountClient.getPurchaseSlips).mockResolvedValue({
        Status: "200",
        Error: null,
        Data: {
          Datas: [{ TOTAL_AMT: "5000000" }],
          TotalCount: 1,
        },
      });

      process.argv = [
        "node", "test",
        "--start-date", "2026-01-01",
        "--end-date", "2026-03-31",
      ];
      await import("../calc-vat.js");
      await new Promise((r) => setTimeout(r, 100));

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      expect(result.salesAmount).toBe(10_000_000);
      expect(result.purchaseAmount).toBe(5_000_000);
    });
  });

  describe("formatting", () => {
    it("includes Korean labels", async () => {
      process.argv = [
        "node", "test",
        "--sales-amount", "50000000",
        "--purchase-amount", "30000000",
      ];
      await import("../calc-vat.js");
      await new Promise((r) => setTimeout(r, 50));

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      expect(result.매출액).toMatch(/원$/);
      expect(result.매입액).toMatch(/원$/);
      expect(result.매출세액).toMatch(/원$/);
      expect(result.매입세액).toMatch(/원$/);
      expect(result.납부세액).toMatch(/원$/);
      expect(result.최종납부세액).toMatch(/원$/);
    });
  });

  describe("CLI: no arguments", () => {
    it("shows usage and exits with code 1", async () => {
      process.argv = ["node", "test"];
      await import("../calc-vat.js");
      await new Promise((r) => setTimeout(r, 50));

      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("error handling", () => {
    it("outputs JSON error on failure", async () => {
      const ecountClient = await import("../ecount-client.js");
      vi.mocked(ecountClient.login).mockRejectedValue(
        new Error("Connection refused")
      );

      process.argv = [
        "node", "test",
        "--start-date", "2026-01-01",
        "--end-date", "2026-03-31",
      ];
      await import("../calc-vat.js");
      await new Promise((r) => setTimeout(r, 100));

      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
