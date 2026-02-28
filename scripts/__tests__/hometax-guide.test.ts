import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("dotenv/config", () => ({}));

describe("hometax-guide", () => {
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

  describe("VAT guide (부가가치세)", () => {
    it("returns complete VAT filing guide", async () => {
      process.argv = ["node", "test", "--type", "vat"];
      await import("../hometax-guide.js");

      expect(logSpy).toHaveBeenCalled();
      const guide = JSON.parse(logSpy.mock.calls[0][0]);

      expect(guide.type).toBe("vat");
      expect(guide.title).toContain("부가가치세");
      expect(guide.url).toBe("https://www.hometax.go.kr");
      expect(guide.requiredDocuments.length).toBeGreaterThan(0);
      expect(guide.steps.length).toBe(8);
    });

    it("has correct step numbers", async () => {
      process.argv = ["node", "test", "--type", "vat"];
      await import("../hometax-guide.js");

      const guide = JSON.parse(logSpy.mock.calls[0][0]);

      for (let i = 0; i < guide.steps.length; i++) {
        expect(guide.steps[i].step).toBe(i + 1);
        expect(guide.steps[i].action).toBeTruthy();
        expect(guide.steps[i].details).toBeTruthy();
      }
    });

    it("includes required documents for VAT", async () => {
      process.argv = ["node", "test", "--type", "vat"];
      await import("../hometax-guide.js");

      const guide = JSON.parse(logSpy.mock.calls[0][0]);
      const docs: string[] = guide.requiredDocuments;

      expect(docs.some((d) => d.includes("세금계산서"))).toBe(true);
      expect(docs.some((d) => d.includes("신용카드"))).toBe(true);
    });
  });

  describe("withholding guide (원천세)", () => {
    it("returns complete withholding filing guide", async () => {
      process.argv = ["node", "test", "--type", "withholding"];
      await import("../hometax-guide.js");

      const guide = JSON.parse(logSpy.mock.calls[0][0]);

      expect(guide.type).toBe("withholding");
      expect(guide.title).toContain("원천세");
      expect(guide.url).toBe("https://www.hometax.go.kr");
      expect(guide.steps.length).toBe(7);
    });

    it("mentions 위택스 for local income tax", async () => {
      process.argv = ["node", "test", "--type", "withholding"];
      await import("../hometax-guide.js");

      const guide = JSON.parse(logSpy.mock.calls[0][0]);
      const lastStep = guide.steps[guide.steps.length - 1];

      expect(lastStep.details).toContain("위택스");
      expect(lastStep.details).toContain("wetax.go.kr");
    });

    it("includes required documents", async () => {
      process.argv = ["node", "test", "--type", "withholding"];
      await import("../hometax-guide.js");

      const guide = JSON.parse(logSpy.mock.calls[0][0]);
      const docs: string[] = guide.requiredDocuments;

      expect(docs.some((d) => d.includes("원천징수이행상황신고서"))).toBe(true);
      expect(docs.some((d) => d.includes("급여"))).toBe(true);
    });
  });

  describe("corporate guide (법인세)", () => {
    it("returns complete corporate tax filing guide", async () => {
      process.argv = ["node", "test", "--type", "corporate"];
      await import("../hometax-guide.js");

      const guide = JSON.parse(logSpy.mock.calls[0][0]);

      expect(guide.type).toBe("corporate");
      expect(guide.title).toContain("법인세");
      expect(guide.url).toBe("https://www.hometax.go.kr");
      expect(guide.steps.length).toBe(10);
    });

    it("includes tax bracket info in step details", async () => {
      process.argv = ["node", "test", "--type", "corporate"];
      await import("../hometax-guide.js");

      const guide = JSON.parse(logSpy.mock.calls[0][0]);
      const taxCalcStep = guide.steps.find(
        (s: { action: string }) => s.action.includes("과세표준")
      );

      expect(taxCalcStep).toBeDefined();
      expect(taxCalcStep.details).toContain("10%");
      expect(taxCalcStep.details).toContain("20%");
      expect(taxCalcStep.details).toContain("22%");
      expect(taxCalcStep.details).toContain("25%");
    });

    it("includes required documents for corporate filing", async () => {
      process.argv = ["node", "test", "--type", "corporate"];
      await import("../hometax-guide.js");

      const guide = JSON.parse(logSpy.mock.calls[0][0]);
      const docs: string[] = guide.requiredDocuments;

      expect(docs.some((d) => d.includes("재무상태표"))).toBe(true);
      expect(docs.some((d) => d.includes("손익계산서"))).toBe(true);
      expect(docs.some((d) => d.includes("세무조정"))).toBe(true);
    });

    it("mentions deadline and local tax", async () => {
      process.argv = ["node", "test", "--type", "corporate"];
      await import("../hometax-guide.js");

      const guide = JSON.parse(logSpy.mock.calls[0][0]);
      const lastStep = guide.steps[guide.steps.length - 1];

      expect(lastStep.details).toContain("3월 31일");
      expect(lastStep.details).toContain("위택스");
    });
  });

  describe("guide structure", () => {
    it("all guides have consistent structure", async () => {
      const types = ["vat", "withholding", "corporate"];

      for (const type of types) {
        vi.resetModules();
        logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        vi.spyOn(console, "error").mockImplementation(() => {});
        vi.spyOn(process, "exit").mockReturnValue(undefined as never);

        process.argv = ["node", "test", "--type", type];
        await import("../hometax-guide.js");

        const guide = JSON.parse(logSpy.mock.calls[0][0]);

        expect(guide).toHaveProperty("type");
        expect(guide).toHaveProperty("title");
        expect(guide).toHaveProperty("url");
        expect(guide).toHaveProperty("requiredDocuments");
        expect(guide).toHaveProperty("steps");
        expect(Array.isArray(guide.requiredDocuments)).toBe(true);
        expect(Array.isArray(guide.steps)).toBe(true);

        for (const step of guide.steps) {
          expect(step).toHaveProperty("step");
          expect(step).toHaveProperty("action");
          expect(step).toHaveProperty("details");
          expect(typeof step.step).toBe("number");
          expect(typeof step.action).toBe("string");
          expect(typeof step.details).toBe("string");
        }
      }
    });
  });

  describe("CLI: no arguments", () => {
    it("shows usage and exits with code 1", async () => {
      process.argv = ["node", "test"];
      // process.exit is mocked, so code continues past the exit check
      // and throws TypeError when trying to call guides[validType]()
      try {
        await import("../hometax-guide.js");
      } catch {
        // Expected: TypeError from code continuing past mocked exit
      }

      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("CLI: invalid type", () => {
    it("shows usage for unknown type", async () => {
      process.argv = ["node", "test", "--type", "invalid"];
      try {
        await import("../hometax-guide.js");
      } catch {
        // Expected: TypeError from code continuing past mocked exit
      }

      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
