import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("dotenv/config", () => ({}));

describe("tax-calendar", () => {
  const ORIGINAL_ARGV = [...process.argv];
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.useFakeTimers();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    exitSpy = vi.spyOn(process, "exit").mockReturnValue(undefined as never);
  });

  afterEach(() => {
    process.argv = ORIGINAL_ARGV;
    vi.useRealTimers();
  });

  describe("--next: upcoming deadlines", () => {
    it("returns upcoming deadlines sorted by dDay", async () => {
      // Set date to 2026-01-05 so several deadlines are upcoming
      vi.setSystemTime(new Date("2026-01-05T00:00:00"));

      process.argv = ["node", "test", "--next"];
      await import("../tax-calendar.js");

      expect(logSpy).toHaveBeenCalled();
      const results: Array<{ dDay: number; deadline: string; name: string }> =
        JSON.parse(logSpy.mock.calls[0][0]);

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(5); // default count

      // Should be sorted by dDay ascending
      for (let i = 1; i < results.length; i++) {
        expect(results[i].dDay).toBeGreaterThanOrEqual(results[i - 1].dDay);
      }

      // All dDay should be >= 0 (upcoming)
      for (const r of results) {
        expect(r.dDay).toBeGreaterThanOrEqual(0);
      }

      // First should be 원천세 (Jan 12) at dDay 7
      expect(results[0].name).toContain("원천세");
      expect(results[0].dDay).toBe(7);
    });

    it("respects --count parameter", async () => {
      vi.setSystemTime(new Date("2026-01-01T00:00:00"));

      process.argv = ["node", "test", "--next", "--count", "2"];
      await import("../tax-calendar.js");

      const results = JSON.parse(logSpy.mock.calls[0][0]);
      expect(results).toHaveLength(2);
    });

    it("shows 'no remaining events' message when all passed", async () => {
      // Set to end of year
      vi.setSystemTime(new Date("2026-12-31T00:00:00"));

      process.argv = ["node", "test", "--next"];
      await import("../tax-calendar.js");

      const result = JSON.parse(logSpy.mock.calls[0][0]);
      expect(result.message).toContain("남은 세무 일정이 없습니다");
    });
  });

  describe("--month: filter by month", () => {
    it("returns events for March 2026", async () => {
      vi.setSystemTime(new Date("2026-01-01T00:00:00"));

      process.argv = ["node", "test", "--month", "2026-03"];
      await import("../tax-calendar.js");

      expect(logSpy).toHaveBeenCalled();
      const results: Array<{ deadline: string; name: string; type: string }> =
        JSON.parse(logSpy.mock.calls[0][0]);

      expect(results.length).toBeGreaterThan(0);

      // All should be in March
      for (const r of results) {
        expect(r.deadline).toMatch(/^2026-03/);
      }

      // March should include 지급명세서, 원천세, 법인세
      const names = results.map((r) => r.name);
      expect(names.some((n) => n.includes("법인세"))).toBe(true);
      expect(names.some((n) => n.includes("원천세"))).toBe(true);
    });

    it("returns empty array for month with no events", async () => {
      vi.setSystemTime(new Date("2026-01-01T00:00:00"));

      process.argv = ["node", "test", "--month", "2026-13"]; // invalid month
      await import("../tax-calendar.js");

      const results = JSON.parse(logSpy.mock.calls[0][0]);
      expect(results).toHaveLength(0);
    });
  });

  describe("--type: filter by event type", () => {
    it("filters VAT events", async () => {
      vi.setSystemTime(new Date("2026-01-01T00:00:00"));

      process.argv = ["node", "test", "--type", "vat"];
      await import("../tax-calendar.js");

      const results: Array<{ type: string }> = JSON.parse(
        logSpy.mock.calls[0][0]
      );

      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        expect(r.type).toBe("vat");
      }
    });

    it("filters withholding events", async () => {
      vi.setSystemTime(new Date("2026-01-01T00:00:00"));

      process.argv = ["node", "test", "--type", "withholding"];
      await import("../tax-calendar.js");

      const results: Array<{ type: string }> = JSON.parse(
        logSpy.mock.calls[0][0]
      );

      expect(results.length).toBe(12); // one per month
      for (const r of results) {
        expect(r.type).toBe("withholding");
      }
    });

    it("filters corporate events", async () => {
      vi.setSystemTime(new Date("2026-01-01T00:00:00"));

      process.argv = ["node", "test", "--type", "corporate"];
      await import("../tax-calendar.js");

      const results: Array<{ type: string; name: string }> = JSON.parse(
        logSpy.mock.calls[0][0]
      );

      expect(results.length).toBe(2); // 확정신고 + 중간예납
      for (const r of results) {
        expect(r.type).toBe("corporate");
      }
    });
  });

  describe("dDay calculation", () => {
    it("calculates positive dDay for future deadlines", async () => {
      vi.setSystemTime(new Date("2026-01-01T00:00:00"));

      process.argv = ["node", "test", "--month", "2026-01"];
      await import("../tax-calendar.js");

      const results: Array<{ dDay: number; deadline: string }> = JSON.parse(
        logSpy.mock.calls[0][0]
      );

      // Jan 12 deadline → dDay = 11
      const withholding = results.find((r) => r.deadline === "2026-01-12");
      expect(withholding?.dDay).toBe(11);

      // Jan 25 deadline → dDay = 24
      const vat = results.find((r) => r.deadline === "2026-01-25");
      expect(vat?.dDay).toBe(24);
    });

    it("calculates zero dDay for today's deadline", async () => {
      vi.setSystemTime(new Date("2026-01-12T00:00:00"));

      process.argv = ["node", "test", "--month", "2026-01"];
      await import("../tax-calendar.js");

      const results: Array<{ dDay: number; deadline: string }> = JSON.parse(
        logSpy.mock.calls[0][0]
      );

      const todayDeadline = results.find((r) => r.deadline === "2026-01-12");
      expect(todayDeadline?.dDay).toBe(0);
    });

    it("calculates negative dDay for past deadlines", async () => {
      vi.setSystemTime(new Date("2026-02-01T00:00:00"));

      process.argv = ["node", "test", "--month", "2026-01"];
      await import("../tax-calendar.js");

      const results: Array<{ dDay: number; deadline: string }> = JSON.parse(
        logSpy.mock.calls[0][0]
      );

      for (const r of results) {
        expect(r.dDay).toBeLessThan(0);
      }
    });
  });

  describe("calendar completeness", () => {
    it("has events for every month of 2026", async () => {
      vi.setSystemTime(new Date("2026-01-01T00:00:00"));

      for (let month = 1; month <= 12; month++) {
        vi.resetModules();
        logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        vi.spyOn(console, "error").mockImplementation(() => {});
        vi.spyOn(process, "exit").mockReturnValue(undefined as never);

        const monthStr = `2026-${String(month).padStart(2, "0")}`;
        process.argv = ["node", "test", "--month", monthStr];
        await import("../tax-calendar.js");

        const results = JSON.parse(logSpy.mock.calls[0][0]);
        expect(results.length).toBeGreaterThan(0);
      }
    });
  });

  describe("event data structure", () => {
    it("each event has required fields", async () => {
      vi.setSystemTime(new Date("2026-01-01T00:00:00"));

      process.argv = ["node", "test", "--month", "2026-01"];
      await import("../tax-calendar.js");

      const results: Array<Record<string, unknown>> = JSON.parse(
        logSpy.mock.calls[0][0]
      );

      for (const event of results) {
        expect(event).toHaveProperty("type");
        expect(event).toHaveProperty("name");
        expect(event).toHaveProperty("deadline");
        expect(event).toHaveProperty("dDay");
        expect(event).toHaveProperty("description");
        expect(event).toHaveProperty("preparation");
        expect(typeof event.type).toBe("string");
        expect(typeof event.name).toBe("string");
        expect(typeof event.deadline).toBe("string");
        expect(typeof event.dDay).toBe("number");
      }
    });
  });

  describe("CLI: no arguments", () => {
    it("shows usage and exits with code 1", async () => {
      vi.setSystemTime(new Date("2026-01-01T00:00:00"));

      process.argv = ["node", "test"];
      await import("../tax-calendar.js");

      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
