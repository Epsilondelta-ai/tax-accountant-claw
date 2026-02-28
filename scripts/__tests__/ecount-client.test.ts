import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dotenv/config to prevent side effects
vi.mock("dotenv/config", () => ({}));

describe("ecount-client", () => {
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

  describe("login", () => {
    it("returns sessionId and zone on success", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: {
            Datas: {
              SESSION_ID: "sess_abc123",
              ZONE: "Q",
            },
          },
        }),
      };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

      const { login } = await import("../ecount-client.js");
      const result = await login();

      expect(result.sessionId).toBe("sess_abc123");
      expect(result.zone).toBe("Q");

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      expect(fetchCall[0]).toBe("https://sboapiQ.ecount.com/OAPI/V2/OAPILogin");
      const body = JSON.parse((fetchCall[1] as RequestInit).body as string);
      expect(body.COM_CODE).toBe("TESTCOM");
      expect(body.USER_ID).toBe("testuser");
      expect(body.API_CERT_KEY).toBe("testapikey123");
    });

    it("accepts custom config", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200 OK",
          Error: null,
          Data: { Datas: { SESSION_ID: "custom_sess", ZONE: "Z" } },
        }),
      };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

      const { login } = await import("../ecount-client.js");
      const result = await login({
        comCode: "CUSTOM",
        userId: "customuser",
        apiCertKey: "customkey",
        zone: "Z",
      });

      expect(result.sessionId).toBe("custom_sess");
      expect(result.zone).toBe("Z");
    });

    it("throws on HTTP error", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        })
      );

      const { login } = await import("../ecount-client.js");
      await expect(login()).rejects.toThrow("Login failed: HTTP 500 Internal Server Error");
    });

    it("throws on API error status", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({
            Status: "401",
            Error: "Invalid credentials",
            Data: null,
          }),
        })
      );

      const { login } = await import("../ecount-client.js");
      await expect(login()).rejects.toThrow("Login failed: Invalid credentials");
    });

    it("throws on API error status with null error message", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({
            Status: "401",
            Error: null,
            Data: null,
          }),
        })
      );

      const { login } = await import("../ecount-client.js");
      await expect(login()).rejects.toThrow("Login failed: 401");
    });

    it("throws when env vars are missing", async () => {
      delete process.env.ECOUNT_COM_CODE;

      const { login } = await import("../ecount-client.js");
      await expect(login()).rejects.toThrow("Missing required environment variables");
    });

    it("uses fallback zone from config when ZONE is not in response", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: {
            Datas: {
              SESSION_ID: "sess_noz",
              ZONE: undefined,
            },
          },
        }),
      };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

      const { login } = await import("../ecount-client.js");
      const result = await login();
      expect(result.zone).toBe("Q"); // fallback to config zone
    });
  });

  describe("getSalesSlips", () => {
    it("calls the correct endpoint with formatted dates", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Data: { Datas: [{ SUPPLY_AMT: "1000000" }], TotalCount: 1 },
        }),
      };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

      const { getSalesSlips } = await import("../ecount-client.js");
      const result = await getSalesSlips("sess_123", "Q", "2026-01-01", "2026-03-31");

      expect(result.Data.Datas).toHaveLength(1);

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      expect(fetchCall[0]).toBe(
        "https://sboapiQ.ecount.com/OAPI/V2/Sale/GetListSaleSlipAll"
      );
      const headers = (fetchCall[1] as RequestInit).headers as Record<string, string>;
      expect(headers.SESSION_ID).toBe("sess_123");
      const body = JSON.parse((fetchCall[1] as RequestInit).body as string);
      expect(body.BASE_DATE_FROM).toBe("20260101");
      expect(body.BASE_DATE_TO).toBe("20260331");
    });

    it("throws on HTTP error", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 403,
          statusText: "Forbidden",
        })
      );

      const { getSalesSlips } = await import("../ecount-client.js");
      await expect(
        getSalesSlips("sess_123", "Q", "2026-01-01", "2026-03-31")
      ).rejects.toThrow("API call failed: HTTP 403 Forbidden");
    });
  });

  describe("getPurchaseSlips", () => {
    it("calls the correct endpoint", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Data: { Datas: [], TotalCount: 0 },
        }),
      };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

      const { getPurchaseSlips } = await import("../ecount-client.js");
      await getPurchaseSlips("sess_456", "Z", "2026-04-01", "2026-06-30");

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      expect(fetchCall[0]).toBe(
        "https://sboapiZ.ecount.com/OAPI/V2/Sale/GetListPurchaseSlipAll"
      );
      const body = JSON.parse((fetchCall[1] as RequestInit).body as string);
      expect(body.BASE_DATE_FROM).toBe("20260401");
      expect(body.BASE_DATE_TO).toBe("20260630");
    });
  });

  describe("getPayroll", () => {
    it("calls the correct endpoint with year and month", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Data: { Datas: [{ EMP_NAME: "홍길동" }], TotalCount: 1 },
        }),
      };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

      const { getPayroll } = await import("../ecount-client.js");
      const result = await getPayroll("sess_789", "Q", "2026-03");

      expect(result.Data.Datas).toHaveLength(1);

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      expect(fetchCall[0]).toBe(
        "https://sboapiQ.ecount.com/OAPI/V2/HRSalary/GetListSalarySlip"
      );
      const body = JSON.parse((fetchCall[1] as RequestInit).body as string);
      expect(body.YEAR).toBe("2026");
      expect(body.MONTH).toBe("03");
    });
  });

  describe("CLI (main)", () => {
    it("does not run main() when imported as module", async () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // isDirectRun guard checks process.argv[1]
      process.argv = ["node", "/some/other/module.ts"];

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: vi.fn() })
      );

      await import("../ecount-client.js");

      // main() should not have been called
      expect(logSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("runs test mode when --test flag and ecount-client in argv", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: { Datas: { SESSION_ID: "test_sess_long_id", ZONE: "Q" } },
        }),
      };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      process.argv = ["node", "/path/to/ecount-client.ts", "--test"];

      await import("../ecount-client.js");
      // Wait for async main()
      await new Promise((r) => setTimeout(r, 50));

      expect(logSpy).toHaveBeenCalled();
      const output = JSON.parse(logSpy.mock.calls[0][0]);
      expect(output.success).toBe(true);
      expect(output.message).toBe("로그인 성공");
      expect(output.zone).toBe("Q");
    });

    it("shows usage when no action provided and ecount-client in argv", async () => {
      vi.stubGlobal("fetch", vi.fn());
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, "exit").mockReturnValue(undefined as never);

      process.argv = ["node", "/path/to/ecount-client.ts"];

      await import("../ecount-client.js");
      await new Promise((r) => setTimeout(r, 50));

      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("handles login action", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: { Datas: { SESSION_ID: "full_sess_id", ZONE: "Q" } },
        }),
      };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      process.argv = ["node", "/path/to/ecount-client.ts", "--action", "login"];

      await import("../ecount-client.js");
      await new Promise((r) => setTimeout(r, 50));

      expect(logSpy).toHaveBeenCalled();
      const output = JSON.parse(logSpy.mock.calls[0][0]);
      expect(output.success).toBe(true);
      expect(output.sessionId).toBe("full_sess_id");
    });

    it("handles sales action", async () => {
      const loginResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: { Datas: { SESSION_ID: "sess_s", ZONE: "Q" } },
        }),
      };
      const salesResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Data: { Datas: [{ SUPPLY_AMT: "500000" }], TotalCount: 1 },
        }),
      };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(loginResponse).mockResolvedValueOnce(salesResponse)
      );

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      process.argv = [
        "node",
        "/path/to/ecount-client.ts",
        "--action",
        "sales",
        "--start-date",
        "2026-01-01",
        "--end-date",
        "2026-03-31",
      ];

      await import("../ecount-client.js");
      await new Promise((r) => setTimeout(r, 50));

      expect(logSpy).toHaveBeenCalled();
      const output = JSON.parse(logSpy.mock.calls[0][0]);
      expect(output.Data.TotalCount).toBe(1);
    });

    it("throws when sales action missing dates", async () => {
      const loginResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: { Datas: { SESSION_ID: "sess_e", ZONE: "Q" } },
        }),
      };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(loginResponse));

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, "exit").mockReturnValue(undefined as never);
      process.argv = [
        "node",
        "/path/to/ecount-client.ts",
        "--action",
        "sales",
      ];

      await import("../ecount-client.js");
      await new Promise((r) => setTimeout(r, 50));

      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("handles purchases action", async () => {
      const loginResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: { Datas: { SESSION_ID: "sess_p", ZONE: "Q" } },
        }),
      };
      const purchaseResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Data: { Datas: [], TotalCount: 0 },
        }),
      };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(loginResponse).mockResolvedValueOnce(purchaseResponse)
      );

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      process.argv = [
        "node",
        "/path/to/ecount-client.ts",
        "--action",
        "purchases",
        "--start-date",
        "2026-01-01",
        "--end-date",
        "2026-03-31",
      ];

      await import("../ecount-client.js");
      await new Promise((r) => setTimeout(r, 50));

      expect(logSpy).toHaveBeenCalled();
    });

    it("throws when purchases action missing dates", async () => {
      const loginResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: { Datas: { SESSION_ID: "sess_pe", ZONE: "Q" } },
        }),
      };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(loginResponse));

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, "exit").mockReturnValue(undefined as never);
      process.argv = [
        "node",
        "/path/to/ecount-client.ts",
        "--action",
        "purchases",
      ];

      await import("../ecount-client.js");
      await new Promise((r) => setTimeout(r, 50));

      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("handles payroll action", async () => {
      const loginResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: { Datas: { SESSION_ID: "sess_pr", ZONE: "Q" } },
        }),
      };
      const payrollResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Data: { Datas: [{ EMP_NAME: "김철수" }], TotalCount: 1 },
        }),
      };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(loginResponse).mockResolvedValueOnce(payrollResponse)
      );

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      process.argv = [
        "node",
        "/path/to/ecount-client.ts",
        "--action",
        "payroll",
        "--month",
        "2026-03",
      ];

      await import("../ecount-client.js");
      await new Promise((r) => setTimeout(r, 50));

      expect(logSpy).toHaveBeenCalled();
    });

    it("throws when payroll action missing month", async () => {
      const loginResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: { Datas: { SESSION_ID: "sess_pm", ZONE: "Q" } },
        }),
      };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(loginResponse));

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, "exit").mockReturnValue(undefined as never);
      process.argv = [
        "node",
        "/path/to/ecount-client.ts",
        "--action",
        "payroll",
      ];

      await import("../ecount-client.js");
      await new Promise((r) => setTimeout(r, 50));

      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("throws on unknown action", async () => {
      const loginResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          Status: "200",
          Error: null,
          Data: { Datas: { SESSION_ID: "sess_u", ZONE: "Q" } },
        }),
      };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(loginResponse));

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, "exit").mockReturnValue(undefined as never);
      process.argv = [
        "node",
        "/path/to/ecount-client.ts",
        "--action",
        "unknown",
      ];

      await import("../ecount-client.js");
      await new Promise((r) => setTimeout(r, 50));

      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
