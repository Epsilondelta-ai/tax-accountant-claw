import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("dotenv/config", () => ({}));

describe("calc-withholding", () => {
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

  describe("calculation: 3,000,000원, 1인", () => {
    it("returns correct income tax from bracket table", async () => {
      process.argv = ["node", "test", "--salary", "3000000", "--dependents", "1"];
      await import("../calc-withholding.js");

      expect(logSpy).toHaveBeenCalled();
      const result = JSON.parse(logSpy.mock.calls[0][0]);
      expect(result.salary).toBe(3_000_000);
      expect(result.dependents).toBe(1);
      expect(result.incomeTax).toBe(66_360); // exact bracket value for 3M, 1 dependent
      expect(result.localTax).toBe(6_636); // 10% of income tax
      expect(result.totalWithholding).toBe(72_996);
    });
  });

  describe("calculation: 5,000,000원, 1인", () => {
    it("returns correct tax for 5M salary", async () => {
      process.argv = ["node", "test", "--salary", "5000000", "--dependents", "1"];
      await import("../calc-withholding.js");

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      expect(result.salary).toBe(5_000_000);
      expect(result.incomeTax).toBe(225_990);
      expect(result.localTax).toBe(22_599);
    });
  });

  describe("calculation: 3,000,000원, 2인 (30% discount)", () => {
    it("applies dependent discount rate", async () => {
      process.argv = ["node", "test", "--salary", "3000000", "--dependents", "2"];
      await import("../calc-withholding.js");

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      expect(result.dependents).toBe(2);
      // 66,360 × (1 - 0.30) = 46,452
      expect(result.incomeTax).toBe(46_452);
      expect(result.localTax).toBe(4_645);
    });
  });

  describe("calculation: 3,000,000원, 3인 (50% discount)", () => {
    it("applies 50% discount for 3 dependents", async () => {
      process.argv = ["node", "test", "--salary", "3000000", "--dependents", "3"];
      await import("../calc-withholding.js");

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      // 66,360 × (1 - 0.50) = 33,180
      expect(result.incomeTax).toBe(33_180);
    });
  });

  describe("calculation: 3,000,000원, 5인+ (75% discount)", () => {
    it("clamps dependents to max 5", async () => {
      process.argv = ["node", "test", "--salary", "3000000", "--dependents", "7"];
      await import("../calc-withholding.js");

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      // 66,360 × (1 - 0.75) = 16,590
      expect(result.incomeTax).toBe(16_590);
      expect(result.dependents).toBe(7); // original value preserved in result
    });
  });

  describe("salary below lowest bracket", () => {
    it("returns 0 tax for very low salary", async () => {
      process.argv = ["node", "test", "--salary", "1000000", "--dependents", "1"];
      await import("../calc-withholding.js");

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      expect(result.incomeTax).toBe(0);
      expect(result.localTax).toBe(0);
      expect(result.totalWithholding).toBe(0);
    });
  });

  describe("salary above highest bracket", () => {
    it("extrapolates tax for very high salary", async () => {
      process.argv = ["node", "test", "--salary", "15000000", "--dependents", "1"];
      await import("../calc-withholding.js");

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      expect(result.salary).toBe(15_000_000);
      expect(result.incomeTax).toBeGreaterThan(882_170); // above the max bracket
    });
  });

  describe("interpolation between brackets", () => {
    it("linearly interpolates between 2.5M and 3M", async () => {
      process.argv = ["node", "test", "--salary", "2750000", "--dependents", "1"];
      await import("../calc-withholding.js");

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      // Between 39,960 (2.5M) and 66,360 (3M), midpoint = 53,160
      expect(result.incomeTax).toBe(53_160);
    });
  });

  describe("formatting", () => {
    it("formats KRW values with 원 suffix", async () => {
      process.argv = ["node", "test", "--salary", "3000000", "--dependents", "1"];
      await import("../calc-withholding.js");

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      expect(result.급여).toMatch(/원$/);
      expect(result.소득세).toMatch(/원$/);
      expect(result.지방소득세).toMatch(/원$/);
      expect(result.원천징수합계).toMatch(/원$/);
    });
  });

  describe("CLI: missing salary", () => {
    it("shows usage and exits with code 1", async () => {
      process.argv = ["node", "test"];
      await import("../calc-withholding.js");

      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("CLI: zero salary", () => {
    it("shows usage and exits with code 1", async () => {
      process.argv = ["node", "test", "--salary", "0"];
      await import("../calc-withholding.js");

      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("CLI: default dependents", () => {
    it("defaults to 1 dependent when not specified", async () => {
      process.argv = ["node", "test", "--salary", "3000000"];
      await import("../calc-withholding.js");

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      expect(result.dependents).toBe(1);
      expect(result.공제대상가족수).toBe(1);
    });
  });
});
