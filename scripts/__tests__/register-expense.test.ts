import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dotenv/config to prevent side effects
vi.mock("dotenv/config", () => ({}));

describe("register-expense", () => {
  const ORIGINAL_ENV = { ...process.env };
  const ORIGINAL_ARGV = [...process.argv];

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env = {
      ...ORIGINAL_ENV,
      ECOUNT_COM_CODE: "TESTCOM",
      ECOUNT_USER_ID: "testuser",
      ECOUNT_API_CERT_KEY: "testapikey123",
      ECOUNT_ZONE: "Q",
    };
    process.argv = [...ORIGINAL_ARGV];
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    process.argv = ORIGINAL_ARGV;
  });

  describe("splitVat", () => {
    it("splits VAT-included amount correctly", async () => {
      const { splitVat } = await import("../register-expense.js");
      const result = splitVat(110000, true);
      expect(result.supply).toBe(100000);
      expect(result.vat).toBe(10000);
    });

    it("splits VAT-included amount with rounding", async () => {
      const { splitVat } = await import("../register-expense.js");
      const result = splitVat(45000, true);
      expect(result.supply).toBe(40909);
      expect(result.vat).toBe(4091);
      expect(result.supply + result.vat).toBe(45000);
    });

    it("calculates VAT on VAT-excluded amount", async () => {
      const { splitVat } = await import("../register-expense.js");
      const result = splitVat(100000, false);
      expect(result.supply).toBe(100000);
      expect(result.vat).toBe(10000);
    });

    it("handles zero amount", async () => {
      const { splitVat } = await import("../register-expense.js");
      const result = splitVat(0, true);
      expect(result.supply).toBe(0);
      expect(result.vat).toBe(0);
    });

    it("handles small amounts", async () => {
      const { splitVat } = await import("../register-expense.js");
      const result = splitVat(1100, true);
      expect(result.supply).toBe(1000);
      expect(result.vat).toBe(100);
    });
  });

  describe("registerExpense", () => {
    it("calls login and createPurchaseSlip with correct args", async () => {
      // Mock fetch for login + createPurchaseSlip
      const loginResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: { Datas: { SESSION_ID: "sess_test", ZONE: "Q" } },
        }),
      };
      const purchaseResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: { Datas: {} },
        }),
      };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(loginResponse).mockResolvedValueOnce(purchaseResponse)
      );

      const { registerExpense } = await import("../register-expense.js");
      const result = await registerExpense({
        date: "2026-02-28",
        amount: 45000,
        vendor: "스타벅스강남점",
        description: "커피 회의비",
        cardCompany: "신한카드",
        approvalNumber: "123456",
        vatIncluded: true,
      });

      expect(result.success).toBe(true);
      expect(result.date).toBe("2026-02-28");
      expect(result.vendor).toBe("스타벅스강남점");
      expect(result.supplyAmount).toBe(40909);
      expect(result.vatAmount).toBe(4091);
      expect(result.totalAmount).toBe(45000);
      expect(result.cardCompany).toBe("신한카드");
      expect(result.approvalNumber).toBe("123456");

      // Verify fetch was called twice (login + purchase)
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);

      // Verify purchase slip call
      const purchaseCall = vi.mocked(fetch).mock.calls[1];
      const url = purchaseCall[0] as string;
      expect(url).toContain("/OAPI/V2/Purchases/SavePurchases");
      expect(url).toContain("SESSION_ID=sess_test");

      const body = JSON.parse((purchaseCall[1] as RequestInit).body as string);
      expect(body.PurchasesList).toHaveLength(1);
      expect(body.PurchasesList[0].BulkDatas.AMT).toBe("40909");
      expect(body.PurchasesList[0].BulkDatas.VAT_AMT).toBe("4091");
      expect(body.PurchasesList[0].BulkDatas.CUST_NM).toBe("스타벅스강남점");
      expect(body.PurchasesList[0].BulkDatas.CARD_CD).toBe("신한카드");
    });

    it("includes user in description when provided", async () => {
      const loginResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: { Datas: { SESSION_ID: "sess_user", ZONE: "Q" } },
        }),
      };
      const purchaseResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: { Datas: {} },
        }),
      };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(loginResponse).mockResolvedValueOnce(purchaseResponse)
      );

      const { registerExpense } = await import("../register-expense.js");
      const result = await registerExpense({
        date: "2026-02-28",
        amount: 45000,
        vendor: "스타벅스강남점",
        description: "거래처 미팅 식대",
        user: "홍길동",
        accountCode: "접대비",
        vatIncluded: true,
      });

      expect(result.success).toBe(true);
      expect(result.user).toBe("홍길동");
      expect(result.description).toBe("거래처 미팅 식대");

      // Verify the purchase slip description includes [user]
      const purchaseCall = vi.mocked(fetch).mock.calls[1];
      const body = JSON.parse((purchaseCall[1] as RequestInit).body as string);
      expect(body.PurchasesList[0].BulkDatas.PROD_DES).toBe("[홍길동] 거래처 미팅 식대");
      expect(body.PurchasesList[0].BulkDatas.ACCT_CD).toBe("접대비");
    });

    it("omits user prefix in description when user not provided", async () => {
      const loginResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: { Datas: { SESSION_ID: "sess_nouser", ZONE: "Q" } },
        }),
      };
      const purchaseResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: { Datas: {} },
        }),
      };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(loginResponse).mockResolvedValueOnce(purchaseResponse)
      );

      const { registerExpense } = await import("../register-expense.js");
      await registerExpense({
        date: "2026-02-28",
        amount: 45000,
        vendor: "스타벅스",
        description: "커피",
        vatIncluded: true,
      });

      const purchaseCall = vi.mocked(fetch).mock.calls[1];
      const body = JSON.parse((purchaseCall[1] as RequestInit).body as string);
      expect(body.PurchasesList[0].BulkDatas.PROD_DES).toBe("커피");
    });

    it("handles VAT-excluded amounts", async () => {
      const loginResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: { Datas: { SESSION_ID: "sess_test2", ZONE: "Q" } },
        }),
      };
      const purchaseResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: { Datas: {} },
        }),
      };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(loginResponse).mockResolvedValueOnce(purchaseResponse)
      );

      const { registerExpense } = await import("../register-expense.js");
      const result = await registerExpense({
        date: "2026-02-28",
        amount: 100000,
        vendor: "사무용품점",
        description: "사무용품",
        vatIncluded: false,
      });

      expect(result.supplyAmount).toBe(100000);
      expect(result.vatAmount).toBe(10000);
      expect(result.totalAmount).toBe(110000);
    });

    it("throws on login failure", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        })
      );

      const { registerExpense } = await import("../register-expense.js");
      await expect(
        registerExpense({
          date: "2026-02-28",
          amount: 45000,
          vendor: "테스트",
          description: "테스트",
          vatIncluded: true,
        })
      ).rejects.toThrow("Login failed");
    });

    it("throws on purchase slip creation failure", async () => {
      const loginResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: { Datas: { SESSION_ID: "sess_fail", ZONE: "Q" } },
        }),
      };
      vi.stubGlobal(
        "fetch",
        vi.fn()
          .mockResolvedValueOnce(loginResponse)
          .mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue({
              Status: "401",
              Error: "Unauthorized",
              Data: null,
            }),
          })
      );

      const { registerExpense } = await import("../register-expense.js");
      await expect(
        registerExpense({
          date: "2026-02-28",
          amount: 45000,
          vendor: "테스트",
          description: "테스트",
          vatIncluded: true,
        })
      ).rejects.toThrow("Purchase slip creation failed");
    });
  });

  describe("CLI", () => {
    it("does not run main() when imported as module", async () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      process.argv = ["node", "/some/other/module.ts"];

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: vi.fn() })
      );

      await import("../register-expense.js");

      expect(logSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("shows usage when required args missing and register-expense in argv", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, "exit").mockReturnValue(undefined as never);

      process.argv = ["node", "/path/to/register-expense.ts"];

      await import("../register-expense.js");
      await new Promise((r) => setTimeout(r, 50));

      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("runs successfully with all required args", async () => {
      const loginResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: { Datas: { SESSION_ID: "sess_cli", ZONE: "Q" } },
        }),
      };
      const purchaseResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: { Datas: {} },
        }),
      };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(loginResponse).mockResolvedValueOnce(purchaseResponse)
      );

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      process.argv = [
        "node",
        "/path/to/register-expense.ts",
        "--date",
        "2026-02-28",
        "--amount",
        "45000",
        "--vendor",
        "스타벅스강남점",
        "--description",
        "커피 회의비",
        "--card-company",
        "신한카드",
        "--approval-number",
        "123456",
      ];

      await import("../register-expense.js");
      await new Promise((r) => setTimeout(r, 50));

      expect(logSpy).toHaveBeenCalled();
      const output = JSON.parse(logSpy.mock.calls[0][0]);
      expect(output.success).toBe(true);
      expect(output.vendor).toBe("스타벅스강남점");
    });

    it("passes --user flag to result", async () => {
      const loginResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: { Datas: { SESSION_ID: "sess_usr_cli", ZONE: "Q" } },
        }),
      };
      const purchaseResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: { Datas: {} },
        }),
      };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(loginResponse).mockResolvedValueOnce(purchaseResponse)
      );

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      process.argv = [
        "node",
        "/path/to/register-expense.ts",
        "--date",
        "2026-02-28",
        "--amount",
        "45000",
        "--vendor",
        "스타벅스강남점",
        "--description",
        "거래처 미팅 식대",
        "--user",
        "홍길동",
        "--account-code",
        "접대비",
      ];

      await import("../register-expense.js");
      await new Promise((r) => setTimeout(r, 50));

      expect(logSpy).toHaveBeenCalled();
      const output = JSON.parse(logSpy.mock.calls[0][0]);
      expect(output.success).toBe(true);
      expect(output.user).toBe("홍길동");
      expect(output.description).toBe("거래처 미팅 식대");
    });

    it("handles --vat-excluded flag", async () => {
      const loginResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: { Datas: { SESSION_ID: "sess_vat", ZONE: "Q" } },
        }),
      };
      const purchaseResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: { Datas: {} },
        }),
      };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(loginResponse).mockResolvedValueOnce(purchaseResponse)
      );

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      process.argv = [
        "node",
        "/path/to/register-expense.ts",
        "--date",
        "2026-02-28",
        "--amount",
        "100000",
        "--vendor",
        "사무용품점",
        "--description",
        "사무용품",
        "--vat-excluded",
      ];

      await import("../register-expense.js");
      await new Promise((r) => setTimeout(r, 50));

      expect(logSpy).toHaveBeenCalled();
      const output = JSON.parse(logSpy.mock.calls[0][0]);
      expect(output.supplyAmount).toBe(100000);
      expect(output.vatAmount).toBe(10000);
    });

    it("handles API error gracefully", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        })
      );

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, "exit").mockReturnValue(undefined as never);
      process.argv = [
        "node",
        "/path/to/register-expense.ts",
        "--date",
        "2026-02-28",
        "--amount",
        "45000",
        "--vendor",
        "테스트",
        "--description",
        "테스트",
      ];

      await import("../register-expense.js");
      await new Promise((r) => setTimeout(r, 50));

      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
