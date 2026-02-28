import "dotenv/config";

// ─── Types ───────────────────────────────────────────────────────────────────

interface EcountLoginResponse {
  Status: string;
  Error: string | null;
  Data: {
    Datas: {
      SESSION_ID: string;
      ZONE: string;
    };
  };
}

interface EcountSlipResponse {
  Status: string;
  Error: string | null;
  Data: {
    Datas: Record<string, unknown>[];
    TotalCount: number;
  };
}

interface EcountConfig {
  comCode: string;
  userId: string;
  apiCertKey: string;
  zone: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────

function loadConfig(): EcountConfig {
  const comCode = process.env.ECOUNT_COM_CODE;
  const userId = process.env.ECOUNT_USER_ID;
  const apiCertKey = process.env.ECOUNT_API_CERT_KEY;
  const zone = process.env.ECOUNT_ZONE;

  if (!comCode || !userId || !apiCertKey || !zone) {
    throw new Error(
      "Missing required environment variables: ECOUNT_COM_CODE, ECOUNT_USER_ID, ECOUNT_API_CERT_KEY, ECOUNT_ZONE"
    );
  }

  return { comCode, userId, apiCertKey, zone };
}

function baseUrl(zone: string): string {
  return `https://sboapi${zone}.ecount.com`;
}

// ─── API Functions ───────────────────────────────────────────────────────────

export async function login(
  config?: EcountConfig
): Promise<{ sessionId: string; zone: string }> {
  const cfg = config ?? loadConfig();
  const url = `${baseUrl(cfg.zone)}/OAPI/V2/OAPILogin`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      COM_CODE: cfg.comCode,
      USER_ID: cfg.userId,
      API_CERT_KEY: cfg.apiCertKey,
      LAN_TYPE: "ko-KR",
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: HTTP ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as EcountLoginResponse;

  if (data.Status !== "200" && data.Status !== "200 OK") {
    throw new Error(`Login failed: ${data.Error ?? data.Status}`);
  }

  return {
    sessionId: data.Data.Datas.SESSION_ID,
    zone: data.Data.Datas.ZONE ?? cfg.zone,
  };
}

async function authenticatedPost(
  zone: string,
  sessionId: string,
  endpoint: string,
  body: Record<string, unknown>
): Promise<EcountSlipResponse> {
  const url = `${baseUrl(zone)}${endpoint}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      SESSION_ID: sessionId,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API call failed: HTTP ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as EcountSlipResponse;
}

export async function getSalesSlips(
  sessionId: string,
  zone: string,
  startDate: string,
  endDate: string
): Promise<EcountSlipResponse> {
  return authenticatedPost(zone, sessionId, "/OAPI/V2/Sale/GetListSaleSlipAll", {
    BASE_DATE_FROM: startDate.replace(/-/g, ""),
    BASE_DATE_TO: endDate.replace(/-/g, ""),
  });
}

export async function getPurchaseSlips(
  sessionId: string,
  zone: string,
  startDate: string,
  endDate: string
): Promise<EcountSlipResponse> {
  return authenticatedPost(zone, sessionId, "/OAPI/V2/Sale/GetListPurchaseSlipAll", {
    BASE_DATE_FROM: startDate.replace(/-/g, ""),
    BASE_DATE_TO: endDate.replace(/-/g, ""),
  });
}

export async function getPayroll(
  sessionId: string,
  zone: string,
  yearMonth: string
): Promise<EcountSlipResponse> {
  const [year, month] = yearMonth.split("-");
  return authenticatedPost(zone, sessionId, "/OAPI/V2/HRSalary/GetListSalarySlip", {
    YEAR: year,
    MONTH: month,
  });
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs(): {
  action: string;
  startDate: string;
  endDate: string;
  month: string;
  test: boolean;
} {
  const args = process.argv.slice(2);
  let action = "";
  let startDate = "";
  let endDate = "";
  let month = "";
  let test = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--action":
        action = args[++i] ?? "";
        break;
      case "--start-date":
        startDate = args[++i] ?? "";
        break;
      case "--end-date":
        endDate = args[++i] ?? "";
        break;
      case "--month":
        month = args[++i] ?? "";
        break;
      case "--test":
        test = true;
        break;
    }
  }

  return { action, startDate, endDate, month, test };
}

async function main(): Promise<void> {
  const { action, startDate, endDate, month, test } = parseArgs();

  if (test) {
    const session = await login();
    console.log(
      JSON.stringify(
        {
          success: true,
          message: "로그인 성공",
          sessionId: session.sessionId.substring(0, 8) + "...",
          zone: session.zone,
        },
        null,
        2
      )
    );
    return;
  }

  if (!action) {
    console.error("Usage: tsx scripts/ecount-client.ts --action login|sales|purchases|payroll [options]");
    console.error("  --test                    Test login connection");
    console.error("  --action login             Login and get session");
    console.error("  --action sales             Get sales slips (requires --start-date, --end-date)");
    console.error("  --action purchases         Get purchase slips (requires --start-date, --end-date)");
    console.error("  --action payroll           Get payroll (requires --month YYYY-MM)");
    process.exit(1);
  }

  const config = loadConfig();
  const session = await login(config);

  switch (action) {
    case "login": {
      console.log(
        JSON.stringify(
          {
            success: true,
            sessionId: session.sessionId,
            zone: session.zone,
          },
          null,
          2
        )
      );
      break;
    }

    case "sales": {
      if (!startDate || !endDate) {
        throw new Error("--start-date and --end-date are required for sales action");
      }
      const sales = await getSalesSlips(session.sessionId, session.zone, startDate, endDate);
      console.log(JSON.stringify(sales, null, 2));
      break;
    }

    case "purchases": {
      if (!startDate || !endDate) {
        throw new Error("--start-date and --end-date are required for purchases action");
      }
      const purchases = await getPurchaseSlips(session.sessionId, session.zone, startDate, endDate);
      console.log(JSON.stringify(purchases, null, 2));
      break;
    }

    case "payroll": {
      if (!month) {
        throw new Error("--month is required for payroll action (format: YYYY-MM)");
      }
      const payroll = await getPayroll(session.sessionId, session.zone, month);
      console.log(JSON.stringify(payroll, null, 2));
      break;
    }

    default:
      throw new Error(`Unknown action: ${action}. Use login|sales|purchases|payroll`);
  }
}

// CLI 모드: 직접 실행될 때만 main() 호출 (import 시에는 실행하지 않음)
const isDirectRun = process.argv[1]?.includes("ecount-client");
if (isDirectRun) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ error: true, message }, null, 2));
    process.exit(1);
  });
}
