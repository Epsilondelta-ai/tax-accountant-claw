import "dotenv/config";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CorporateTaxResult {
  과세표준: string;
  법인세: string;
  지방소득세: string;
  총세금: string;
  실효세율: string;
  중소기업감면?: string;
  taxableIncome: number;
  corporateTax: number;
  localTax: number;
  totalTax: number;
  effectiveRate: string;
  smeDeduction?: number;
}

interface TaxBracket {
  upper: number; // 상한 (초과시 다음 구간)
  rate: number; // 세율
  cumulative: number; // 누적 세금 (이전 구간까지)
}

// ─── 2026 법인세율표 ─────────────────────────────────────────────────────────

// 누진세 구간 (2026년 기준)
const CORPORATE_BRACKETS: TaxBracket[] = [
  {
    upper: 200_000_000, // 2억 이하
    rate: 0.10,
    cumulative: 0,
  },
  {
    upper: 20_000_000_000, // 200억 이하
    rate: 0.20,
    cumulative: 20_000_000, // 2억 × 10%
  },
  {
    upper: 300_000_000_000, // 3,000억 이하
    rate: 0.22,
    cumulative: 3_980_000_000, // 20,000,000 + (200억-2억) × 20%
  },
  {
    upper: Infinity, // 3,000억 초과
    rate: 0.25,
    cumulative: 65_560_000_000, // 3,980,000,000 + (3,000억-200억) × 22%
  },
];

// ─── Formatting ──────────────────────────────────────────────────────────────

function formatKRW(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}원`;
}

// ─── Calculation ─────────────────────────────────────────────────────────────

function calculateCorporateTax(
  taxableIncome: number,
  sme: boolean,
  youth: boolean
): CorporateTaxResult {
  if (taxableIncome <= 0) {
    return {
      과세표준: formatKRW(0),
      법인세: formatKRW(0),
      지방소득세: formatKRW(0),
      총세금: formatKRW(0),
      실효세율: "0%",
      taxableIncome: 0,
      corporateTax: 0,
      localTax: 0,
      totalTax: 0,
      effectiveRate: "0%",
    };
  }

  // 누진세 계산
  let corporateTax = 0;
  let prevUpper = 0;

  for (const bracket of CORPORATE_BRACKETS) {
    if (taxableIncome <= bracket.upper) {
      corporateTax = bracket.cumulative + (taxableIncome - prevUpper) * bracket.rate;
      break;
    }
    prevUpper = bracket.upper;
  }

  corporateTax = Math.round(corporateTax);

  // 중소기업 세액감면
  let smeDeduction: number | undefined;
  if (sme) {
    // 청년창업 중소기업: 100% 감면 (5년간), 일반 중소기업: 50% 감면
    const deductionRate = youth ? 1.0 : 0.5;
    smeDeduction = Math.round(corporateTax * deductionRate);
    corporateTax = corporateTax - smeDeduction;
  }

  // 지방소득세 = 법인세 × 10%
  const localTax = Math.round(corporateTax * 0.1);
  const totalTax = corporateTax + localTax;

  const effectiveRate =
    taxableIncome > 0
      ? `${((totalTax / taxableIncome) * 100).toFixed(2)}%`
      : "0%";

  const result: CorporateTaxResult = {
    과세표준: formatKRW(taxableIncome),
    법인세: formatKRW(corporateTax),
    지방소득세: formatKRW(localTax),
    총세금: formatKRW(totalTax),
    실효세율: effectiveRate,
    taxableIncome,
    corporateTax,
    localTax,
    totalTax,
    effectiveRate,
  };

  if (smeDeduction !== undefined) {
    result.중소기업감면 = formatKRW(smeDeduction);
    result.smeDeduction = smeDeduction;
  }

  return result;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs(): { income: number; sme: boolean; youth: boolean } {
  const args = process.argv.slice(2);
  let income = 0;
  let sme = false;
  let youth = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--income":
        income = Number(args[++i]);
        break;
      case "--sme":
        sme = true;
        break;
      case "--youth":
        youth = true;
        break;
    }
  }

  return { income, sme, youth };
}

function main(): void {
  const { income, sme, youth } = parseArgs();

  if (income <= 0) {
    console.error("Usage: tsx scripts/calc-corporate-tax.ts --income <과세표준>");
    console.error("");
    console.error("Options:");
    console.error("  --sme     중소기업 세액감면 적용 (50%)");
    console.error("  --youth   청년창업 중소기업 감면 (100%, --sme와 함께 사용)");
    console.error("");
    console.error("Examples:");
    console.error("  tsx scripts/calc-corporate-tax.ts --income 100000000");
    console.error("  tsx scripts/calc-corporate-tax.ts --income 500000000 --sme");
    console.error("  tsx scripts/calc-corporate-tax.ts --income 200000000 --sme --youth");
    process.exit(1);
  }

  const result = calculateCorporateTax(income, sme, youth);
  console.log(JSON.stringify(result, null, 2));
}

main();
