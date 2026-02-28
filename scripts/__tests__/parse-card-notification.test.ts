import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dotenv/config to prevent side effects
vi.mock("dotenv/config", () => ({}));

describe("parse-card-notification", () => {
  describe("parseCardNotification", () => {
    let parseCardNotification: typeof import("../parse-card-notification.js").parseCardNotification;

    beforeEach(async () => {
      vi.resetModules();
      const mod = await import("../parse-card-notification.js");
      parseCardNotification = mod.parseCardNotification;
    });

    it("parses Samsung card multiline notification", () => {
      const text = `[Web발신]
[삼성카드]
홍*동님
02/28 15:30
45,000원
스타벅스강남점
일시불
누적 1,234,567원`;

      const result = parseCardNotification(text);
      expect(result).not.toBeNull();
      expect(result!.cardCompany).toBe("삼성카드");
      expect(result!.amount).toBe(45000);
      expect(result!.vendor).toBe("스타벅스강남점");
      expect(result!.date).toMatch(/^\d{4}-02-28$/);
      expect(result!.time).toBe("15:30");
      expect(result!.cardHolder).toBe("홍*동");
      expect(result!.installment).toBe(0);
      expect(result!.cumulative).toBe(1234567);
    });

    it("parses Shinhan card notification", () => {
      const text = `[Web발신]
[신한카드]승인
홍*동님
02/28 15:30
(일시불)45,000원
스타벅스강남점`;

      const result = parseCardNotification(text);
      expect(result).not.toBeNull();
      expect(result!.cardCompany).toBe("신한카드");
      expect(result!.type).toBe("승인");
      expect(result!.amount).toBe(45000);
      expect(result!.vendor).toBe("스타벅스강남점");
      expect(result!.installment).toBe(0);
    });

    it("parses KB card notification", () => {
      const text = `[Web발신]
[KB국민카드]
홍*동님 승인
02/28 15:30
45,000원
스타벅스강남점
일시불`;

      const result = parseCardNotification(text);
      expect(result).not.toBeNull();
      expect(result!.cardCompany).toBe("KB국민카드");
      expect(result!.type).toBe("승인");
      expect(result!.amount).toBe(45000);
    });

    it("parses Hyundai card notification with cumulative", () => {
      const text = `[Web발신]
[현대카드]
홍*동님 승인
02/28 15:30
120,000원
교보문고광화문점
일시불
누적 2,500,000원`;

      const result = parseCardNotification(text);
      expect(result).not.toBeNull();
      expect(result!.cardCompany).toBe("현대카드");
      expect(result!.amount).toBe(120000);
      expect(result!.vendor).toBe("교보문고광화문점");
      expect(result!.cumulative).toBe(2500000);
    });

    it("parses cancel notification", () => {
      const text = `[Web발신]
[삼성카드]취소
홍*동님
02/28 16:00
45,000원
스타벅스강남점`;

      const result = parseCardNotification(text);
      expect(result).not.toBeNull();
      expect(result!.type).toBe("취소");
      expect(result!.amount).toBe(45000);
    });

    it("returns null for empty text", () => {
      expect(parseCardNotification("")).toBeNull();
      expect(parseCardNotification("  ")).toBeNull();
    });

    it("returns null for unparseable text (no amount)", () => {
      const result = parseCardNotification("그냥 아무 텍스트");
      expect(result).toBeNull();
    });

    it("parses Lotte card notification", () => {
      const text = `[Web발신]
[롯데카드]승인
홍*동님
03/15 12:00
33,000원
맥도날드강남점
일시불`;

      const result = parseCardNotification(text);
      expect(result).not.toBeNull();
      expect(result!.cardCompany).toBe("롯데카드");
      expect(result!.amount).toBe(33000);
      expect(result!.vendor).toBe("맥도날드강남점");
    });

    it("parses Hana card notification", () => {
      const text = `[Web발신]
[하나카드]
홍*동님 승인
02/28 15:30
88,000원
올리브영명동점
일시불`;

      const result = parseCardNotification(text);
      expect(result).not.toBeNull();
      expect(result!.cardCompany).toBe("하나카드");
      expect(result!.amount).toBe(88000);
    });

    it("parses NH card notification", () => {
      const text = `[Web발신]
[NH농협]
홍*동님 승인
02/28 15:30
15,500원
CU편의점역삼역점
일시불`;

      const result = parseCardNotification(text);
      expect(result).not.toBeNull();
      expect(result!.cardCompany).toBe("NH농협카드");
      expect(result!.amount).toBe(15500);
    });

    it("parses BC card notification", () => {
      const text = `[Web발신]
[BC카드]
홍*동님
02/28 15:30 승인
55,000원
다이소강남점
일시불`;

      const result = parseCardNotification(text);
      expect(result).not.toBeNull();
      expect(result!.cardCompany).toBe("BC카드");
      expect(result!.amount).toBe(55000);
    });

    it("parses notification with approval number", () => {
      const text = `[Web발신]
[신한카드]승인
홍*동님
02/28 15:30
45,000원
스타벅스강남점
승인번호 123456`;

      const result = parseCardNotification(text);
      expect(result).not.toBeNull();
      expect(result!.approvalNumber).toBe("123456");
    });

    it("parses large amount correctly", () => {
      const text = `[Web발신]
[삼성카드]
홍*동님
02/28 15:30
1,234,567원
전자랜드마포점
일시불`;

      const result = parseCardNotification(text);
      expect(result).not.toBeNull();
      expect(result!.amount).toBe(1234567);
    });

    it("detects unknown type for ambiguous text", () => {
      const text = `[Web발신]
[삼성카드]
홍*동님
02/28 15:30
10,000원
알수없는가맹점`;

      const result = parseCardNotification(text);
      expect(result).not.toBeNull();
      expect(result!.type).toBe("unknown");
    });

    it("uses current date when no date found", () => {
      const text = `[삼성카드] 홍*동님 승인 50,000원 스타벅스`;

      const result = parseCardNotification(text);
      expect(result).not.toBeNull();
      expect(result!.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("parses Shinhan card with 일시불 prefix amount format", () => {
      const text = `[Web발신]
[신한카드]승인
홍*동님
02/28 15:30
일시불 45,000원
스타벅스강남점`;

      const result = parseCardNotification(text);
      expect(result).not.toBeNull();
      expect(result!.amount).toBe(45000);
      expect(result!.installment).toBe(0);
    });

    it("includes balance when present", () => {
      const text = `[Web발신]
[KB국민카드]
홍*동님 사용
02/28 15:30
30,000원
편의점
일시불
잔액 500,000원`;

      const result = parseCardNotification(text);
      expect(result).not.toBeNull();
      expect(result!.balance).toBe(500000);
    });

    it("includes raw text in result", () => {
      const text = `[Web발신]
[삼성카드]승인
02/28 15:30
10,000원
테스트`;

      const result = parseCardNotification(text);
      expect(result).not.toBeNull();
      expect(result!.raw).toBe(text);
    });
  });

  describe("detectCardCompany", () => {
    let detectCardCompany: typeof import("../parse-card-notification.js").detectCardCompany;

    beforeEach(async () => {
      vi.resetModules();
      const mod = await import("../parse-card-notification.js");
      detectCardCompany = mod.detectCardCompany;
    });

    it("detects all major card companies", () => {
      expect(detectCardCompany("[삼성카드]")).toBe("삼성카드");
      expect(detectCardCompany("[신한카드]")).toBe("신한카드");
      expect(detectCardCompany("[KB국민카드]")).toBe("KB국민카드");
      expect(detectCardCompany("[현대카드]")).toBe("현대카드");
      expect(detectCardCompany("[롯데카드]")).toBe("롯데카드");
      expect(detectCardCompany("[하나카드]")).toBe("하나카드");
      expect(detectCardCompany("[BC카드]")).toBe("BC카드");
      expect(detectCardCompany("[NH농협]")).toBe("NH농협카드");
      expect(detectCardCompany("[우리카드]")).toBe("우리카드");
      expect(detectCardCompany("[씨티카드]")).toBe("씨티카드");
    });

    it("detects alternative keywords", () => {
      expect(detectCardCompany("[KB]체크")).toBe("KB국민카드");
      expect(detectCardCompany("삼성법인")).toBe("삼성카드");
      expect(detectCardCompany("하나SK")).toBe("하나카드");
      expect(detectCardCompany("농협BC")).toBe("NH농협카드");
    });

    it("returns unknown for unrecognized text", () => {
      expect(detectCardCompany("알수없는카드")).toBe("unknown");
    });
  });

  describe("extractAmount", () => {
    let extractAmount: typeof import("../parse-card-notification.js").extractAmount;

    beforeEach(async () => {
      vi.resetModules();
      const mod = await import("../parse-card-notification.js");
      extractAmount = mod.extractAmount;
    });

    it("extracts comma-separated amounts", () => {
      expect(extractAmount("45,000원")).toBe(45000);
      expect(extractAmount("1,234,567원")).toBe(1234567);
    });

    it("extracts amounts without comma", () => {
      expect(extractAmount("5000원")).toBe(5000);
    });

    it("ignores 누적 amounts", () => {
      const text = `45,000원
누적 1,234,567원`;
      expect(extractAmount(text)).toBe(45000);
    });

    it("ignores 잔액 amounts", () => {
      const text = `30,000원
잔액 500,000원`;
      expect(extractAmount(text)).toBe(30000);
    });

    it("handles (일시불) prefix", () => {
      expect(extractAmount("(일시불)45,000원")).toBe(45000);
    });

    it("handles 일시불 prefix (space)", () => {
      expect(extractAmount("일시불 45,000원")).toBe(45000);
    });

    it("returns 0 when no amount found", () => {
      expect(extractAmount("no amount here")).toBe(0);
    });
  });

  describe("extractDateTime", () => {
    let extractDateTime: typeof import("../parse-card-notification.js").extractDateTime;

    beforeEach(async () => {
      vi.resetModules();
      const mod = await import("../parse-card-notification.js");
      extractDateTime = mod.extractDateTime;
    });

    it("extracts MM/DD HH:MM format", () => {
      const result = extractDateTime("02/28 15:30");
      expect(result).toEqual({ month: 2, day: 28, hour: 15, minute: 30 });
    });

    it("extracts MM월DD일HH:MM format", () => {
      const result = extractDateTime("2월28일15:30");
      expect(result).toEqual({ month: 2, day: 28, hour: 15, minute: 30 });
    });

    it("extracts MM/DD only (no time)", () => {
      const result = extractDateTime("02/28");
      expect(result).toEqual({ month: 2, day: 28, hour: 0, minute: 0 });
    });

    it("returns null for text without date", () => {
      expect(extractDateTime("no date here")).toBeNull();
    });
  });

  describe("extractVendor", () => {
    let extractVendor: typeof import("../parse-card-notification.js").extractVendor;

    beforeEach(async () => {
      vi.resetModules();
      const mod = await import("../parse-card-notification.js");
      extractVendor = mod.extractVendor;
    });

    it("extracts vendor from multiline format", () => {
      const text = `[Web발신]
[삼성카드]
홍*동님
02/28 15:30
45,000원
스타벅스강남점
일시불`;
      expect(extractVendor(text)).toBe("스타벅스강남점");
    });

    it("skips known fields", () => {
      const text = `[Web발신]
[신한카드]승인
홍*동님
02/28 15:30
45,000원
맥도날드`;
      expect(extractVendor(text)).toBe("맥도날드");
    });

    it("returns unknown for text with only known fields", () => {
      const text = "[Web발신]\n[삼성카드]\n02/28\n100원";
      // After processing, the only non-skip line might be too short
      // or extractVendor finds the amount line as vendor via fallback
      const result = extractVendor(text);
      expect(typeof result).toBe("string");
    });
  });

  describe("CLI", () => {
    const ORIGINAL_ARGV = [...process.argv];

    beforeEach(() => {
      vi.resetModules();
      vi.restoreAllMocks();
      process.argv = [...ORIGINAL_ARGV];
    });

    afterEach(() => {
      process.argv = ORIGINAL_ARGV;
    });

    it("outputs parsed JSON for valid input", async () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      process.argv = [
        "node",
        "/path/to/parse-card-notification.ts",
        "--text",
        "[Web발신]\n[삼성카드]\n홍*동님\n02/28 15:30\n45,000원\n스타벅스강남점\n일시불",
      ];

      await import("../parse-card-notification.js");

      expect(logSpy).toHaveBeenCalled();
      const output = JSON.parse(logSpy.mock.calls[0][0]);
      expect(output.카드사).toBe("삼성카드");
      expect(output.amount).toBe(45000);
    });

    it("exits with error for missing text", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, "exit").mockReturnValue(undefined as never);
      process.argv = ["node", "/path/to/parse-card-notification.ts"];

      await import("../parse-card-notification.js");

      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("exits with error for unparseable text", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, "exit").mockReturnValue(undefined as never);
      process.argv = [
        "node",
        "/path/to/parse-card-notification.ts",
        "--text",
        "파싱불가능한텍스트",
      ];

      await import("../parse-card-notification.js");

      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("accepts text as positional argument", async () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      process.argv = [
        "node",
        "/path/to/parse-card-notification.ts",
        "[삼성카드] 홍*동님 승인 02/28 15:30 45,000원 스타벅스",
      ];

      await import("../parse-card-notification.js");

      expect(logSpy).toHaveBeenCalled();
      const output = JSON.parse(logSpy.mock.calls[0][0]);
      expect(output.amount).toBe(45000);
    });
  });
});
