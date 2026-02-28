import "dotenv/config";
import { login, getSalesSlips, getPurchaseSlips } from "./ecount-client.js";

// ─── Types ───────────────────────────────────────────────────────────────────

interface VatResult {
  매출액: string;
  매입액: string;
  매출세액: string;
  매입세액: string;
  납부세액: string;
  공제내역: DeductionDetail[];
  공제합계: string;
  최종납부세액: string;
  salesAmount: number;
  purchaseAmount: number;
  outputTax: number;
  inputTax: number;
  payableTax: number;
  deductions: DeductionDetail[];
  finalTax: number;
}

interface DeductionDetail {
  항목: string;
  금액: string;
  amount: number;
}

// ─── Formatting ──────────────────────────────────────────────────────────────

function formatKRW(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}원`;
}

// ─── Calculation ─────────────────────────────────────────────────────────────

function calculateVat(params: {
  salesAmount: number;
  purchaseAmount: number;
  zeroRate: boolean;
  exempt: boolean;
  cardSales: boolean;
  annualSales?: number;
}): VatResult {
  const { salesAmount, purchaseAmount, zeroRate, exempt, cardSales } = params;

  // 영세율: 매출세액 0%, 면세: 부가세 적용 제외
  const outputTaxRate = zeroRate || exempt ? 0 : 0.1;
  const inputTaxRate = exempt ? 0 : 0.1;

  const outputTax = Math.round(salesAmount * outputTaxRate);
  const inputTax = Math.round(purchaseAmount * inputTaxRate);
  const payableTax = outputTax - inputTax;

  const deductions: DeductionDetail[] = [];

  // 신용카드매출전표 발행 세액공제
  if (cardSales) {
    const annualSales = params.annualSales ?? salesAmount * 4; // 분기 매출 × 4 추정
    if (annualSales <= 1_000_000_000) {
      // 연매출 10억 이하
      const cardDeduction = Math.min(
        Math.round(salesAmount * 0.013),
        10_000_000 // 연간 한도 1,000만원
      );
      deductions.push({
        항목: "신용카드매출전표 발행 세액공제 (1.3%)",
        금액: formatKRW(cardDeduction),
        amount: cardDeduction,
      });
    }
  }

  const totalDeduction = deductions.reduce((sum, d) => sum + d.amount, 0);
  const finalTax = Math.max(0, payableTax - totalDeduction);

  return {
    매출액: formatKRW(salesAmount),
    매입액: formatKRW(purchaseAmount),
    매출세액: formatKRW(outputTax),
    매입세액: formatKRW(inputTax),
    납부세액: formatKRW(payableTax),
    공제내역: deductions,
    공제합계: formatKRW(totalDeduction),
    최종납부세액: formatKRW(finalTax),
    salesAmount,
    purchaseAmount,
    outputTax,
    inputTax,
    payableTax,
    deductions,
    finalTax,
  };
}

// ─── Ecount Fetch ────────────────────────────────────────────────────────────

async function fetchFromEcount(
  startDate: string,
  endDate: string
): Promise<{ salesTotal: number; purchaseTotal: number }> {
  const session = await login();

  const [salesData, purchaseData] = await Promise.all([
    getSalesSlips(session.sessionId, session.zone, startDate, endDate),
    getPurchaseSlips(session.sessionId, session.zone, startDate, endDate),
  ]);

  const salesTotal = (salesData.Data?.Datas ?? []).reduce(
    (sum: number, slip: Record<string, unknown>) => {
      const amount = Number(slip.SUPPLY_AMT ?? slip.TOTAL_AMT ?? 0);
      return sum + amount;
    },
    0
  );

  const purchaseTotal = (purchaseData.Data?.Datas ?? []).reduce(
    (sum: number, slip: Record<string, unknown>) => {
      const amount = Number(slip.SUPPLY_AMT ?? slip.TOTAL_AMT ?? 0);
      return sum + amount;
    },
    0
  );

  return { salesTotal, purchaseTotal };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs(): {
  salesAmount: number;
  purchaseAmount: number;
  startDate: string;
  endDate: string;
  zeroRate: boolean;
  exempt: boolean;
  cardSales: boolean;
  annualSales: number | undefined;
} {
  const args = process.argv.slice(2);
  let salesAmount = 0;
  let purchaseAmount = 0;
  let startDate = "";
  let endDate = "";
  let zeroRate = false;
  let exempt = false;
  let cardSales = false;
  let annualSales: number | undefined;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--sales-amount":
        salesAmount = Number(args[++i]);
        break;
      case "--purchase-amount":
        purchaseAmount = Number(args[++i]);
        break;
      case "--start-date":
        startDate = args[++i] ?? "";
        break;
      case "--end-date":
        endDate = args[++i] ?? "";
        break;
      case "--zero-rate":
        zeroRate = true;
        break;
      case "--exempt":
        exempt = true;
        break;
      case "--card-sales":
        cardSales = true;
        break;
      case "--annual-sales":
        annualSales = Number(args[++i]);
        break;
    }
  }

  return { salesAmount, purchaseAmount, startDate, endDate, zeroRate, exempt, cardSales, annualSales };
}

async function main(): Promise<void> {
  const params = parseArgs();

  let salesAmount = params.salesAmount;
  let purchaseAmount = params.purchaseAmount;

  // Ecount에서 데이터 조회
  if (params.startDate && params.endDate) {
    const ecountData = await fetchFromEcount(params.startDate, params.endDate);
    salesAmount = ecountData.salesTotal;
    purchaseAmount = ecountData.purchaseTotal;
  }

  if (salesAmount === 0 && purchaseAmount === 0) {
    console.error("Usage: tsx scripts/calc-vat.ts --sales-amount <금액> --purchase-amount <금액>");
    console.error("  OR:  tsx scripts/calc-vat.ts --start-date YYYY-MM-DD --end-date YYYY-MM-DD");
    console.error("");
    console.error("Options:");
    console.error("  --zero-rate         영세율 적용");
    console.error("  --exempt            면세 적용");
    console.error("  --card-sales        신용카드매출전표 세액공제 적용");
    console.error("  --annual-sales <금액>  연매출액 (공제율 판단용)");
    process.exit(1);
  }

  const result = calculateVat({
    salesAmount,
    purchaseAmount,
    zeroRate: params.zeroRate,
    exempt: params.exempt,
    cardSales: params.cardSales,
    annualSales: params.annualSales,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ error: true, message }, null, 2));
  process.exit(1);
});
