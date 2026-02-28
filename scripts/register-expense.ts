import "dotenv/config";
import { login, createPurchaseSlip } from "./ecount-client.js";
import type { CreatePurchaseSlipRequest } from "./ecount-client.js";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExpenseArgs {
  date: string;
  amount: number;
  vendor: string;
  description: string;
  user?: string;
  cardCompany?: string;
  cardNumber?: string;
  approvalNumber?: string;
  accountCode?: string;
  vatIncluded: boolean;
}

interface ExpenseResult {
  success: boolean;
  date: string;
  vendor: string;
  description: string;
  user?: string;
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
  supplyAmountFormatted: string;
  vatAmountFormatted: string;
  totalAmountFormatted: string;
  cardCompany?: string;
  approvalNumber?: string;
}

// ─── Formatting ──────────────────────────────────────────────────────────────

function formatKRW(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}원`;
}

// ─── VAT Split ───────────────────────────────────────────────────────────────

export function splitVat(totalAmount: number, vatIncluded: boolean): { supply: number; vat: number } {
  if (vatIncluded) {
    const supply = Math.round(totalAmount / 1.1);
    const vat = totalAmount - supply;
    return { supply, vat };
  }
  return { supply: totalAmount, vat: Math.round(totalAmount * 0.1) };
}

// ─── Register Expense ────────────────────────────────────────────────────────

export async function registerExpense(args: ExpenseArgs): Promise<ExpenseResult> {
  const { supply, vat } = splitVat(args.amount, args.vatIncluded);
  const totalAmount = args.vatIncluded ? args.amount : supply + vat;

  const session = await login();

  const request: CreatePurchaseSlipRequest = {
    slipDate: args.date,
    vendorName: args.vendor,
    items: [
      {
        description: args.user ? `[${args.user}] ${args.description}` : args.description,
        amount: supply,
        vatAmount: vat,
        accountCode: args.accountCode,
      },
    ],
    cardCompanyCode: args.cardCompany,
    cardNumber: args.cardNumber,
    approvalNumber: args.approvalNumber,
    approvalDate: args.date,
  };

  await createPurchaseSlip(session.sessionId, session.zone, request);

  return {
    success: true,
    date: args.date,
    vendor: args.vendor,
    description: args.description,
    user: args.user,
    supplyAmount: supply,
    vatAmount: vat,
    totalAmount,
    supplyAmountFormatted: formatKRW(supply),
    vatAmountFormatted: formatKRW(vat),
    totalAmountFormatted: formatKRW(totalAmount),
    cardCompany: args.cardCompany,
    approvalNumber: args.approvalNumber,
  };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs(): ExpenseArgs {
  const args = process.argv.slice(2);
  let date = "";
  let amount = 0;
  let vendor = "";
  let description = "";
  let cardCompany: string | undefined;
  let cardNumber: string | undefined;
  let approvalNumber: string | undefined;
  let accountCode: string | undefined;
  let vatIncluded = true;
  let user: string | undefined;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--date":
        date = args[++i] ?? "";
        break;
      case "--amount":
        amount = Number(args[++i]);
        break;
      case "--vendor":
        vendor = args[++i] ?? "";
        break;
      case "--description":
        description = args[++i] ?? "";
        break;
      case "--user":
        user = args[++i] ?? "";
        break;
      case "--card-company":
        cardCompany = args[++i] ?? "";
        break;
      case "--card-number":
        cardNumber = args[++i] ?? "";
        break;
      case "--approval-number":
        approvalNumber = args[++i] ?? "";
        break;
      case "--account-code":
        accountCode = args[++i] ?? "";
        break;
      case "--vat-excluded":
        vatIncluded = false;
        break;
    }
  }

  return { date, amount, vendor, description, user, cardCompany, cardNumber, approvalNumber, accountCode, vatIncluded };
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (!args.date || !args.amount || !args.vendor || !args.description) {
    console.error("Usage: tsx scripts/register-expense.ts --date YYYY-MM-DD --amount <금액> --vendor <가맹점> --description <적요> [--user <사용자>]");
    console.error("");
    console.error("Required:");
    console.error("  --date <YYYY-MM-DD>      결제 날짜");
    console.error("  --amount <금액>           결제 금액 (VAT 포함, 기본값)");
    console.error("  --vendor <가맹점>         가맹점명");
    console.error("  --description <적요>      비용 설명");
    console.error("  --user <사용자>          카드 사용자 (대표, 직원명 등)");
    console.error("");
    console.error("Optional:");
    console.error("  --card-company <카드사>    카드사명");
    console.error("  --card-number <번호>      카드번호");
    console.error("  --approval-number <번호>  승인번호");
    console.error("  --account-code <코드>     계정과목 코드 (접대비, 복리후생비, 소모품비 등)");
    console.error("  --vat-excluded            금액이 VAT 미포함인 경우");
    process.exit(1);
  }

  const result = await registerExpense(args);
  console.log(JSON.stringify(result, null, 2));
}

const isDirectRun = process.argv[1]?.includes("register-expense");
if (isDirectRun) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ error: true, message }, null, 2));
    process.exit(1);
  });
}
