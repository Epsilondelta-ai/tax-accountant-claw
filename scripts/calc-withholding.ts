import "dotenv/config";

// ─── Types ───────────────────────────────────────────────────────────────────

interface WithholdingResult {
  급여: string;
  공제대상가족수: number;
  소득세: string;
  지방소득세: string;
  원천징수합계: string;
  salary: number;
  dependents: number;
  incomeTax: number;
  localTax: number;
  totalWithholding: number;
}

interface TaxBracket {
  salary: number;
  tax1: number; // 1인 기준 소득세
}

// ─── 간이세액표 Lookup Table ─────────────────────────────────────────────────

// 2026년 근로소득 간이세액표 (월급여 기준, 1인 공제대상)
const TAX_BRACKETS: TaxBracket[] = [
  { salary: 1_500_000, tax1: 0 },
  { salary: 2_000_000, tax1: 19_520 },
  { salary: 2_500_000, tax1: 39_960 },
  { salary: 3_000_000, tax1: 66_360 },
  { salary: 3_500_000, tax1: 99_960 },
  { salary: 4_000_000, tax1: 140_790 },
  { salary: 4_500_000, tax1: 182_790 },
  { salary: 5_000_000, tax1: 225_990 },
  { salary: 5_500_000, tax1: 277_990 },
  { salary: 6_000_000, tax1: 330_570 },
  { salary: 7_000_000, tax1: 449_340 },
  { salary: 8_000_000, tax1: 582_170 },
  { salary: 9_000_000, tax1: 725_170 },
  { salary: 10_000_000, tax1: 882_170 },
];

// 가족수별 감면율 (1인 대비)
// 2인: ~30% 감면, 3인: ~50% 감면, 4인: ~65% 감면, 5인+: ~75% 감면
const DEPENDENT_DISCOUNT_RATES: Record<number, number> = {
  1: 0,
  2: 0.30,
  3: 0.50,
  4: 0.65,
  5: 0.75,
};

// ─── Formatting ──────────────────────────────────────────────────────────────

function formatKRW(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}원`;
}

// ─── Calculation ─────────────────────────────────────────────────────────────

function interpolateTax(salary: number): number {
  if (salary <= TAX_BRACKETS[0].salary) {
    return 0;
  }

  const lastBracket = TAX_BRACKETS[TAX_BRACKETS.length - 1];
  if (salary >= lastBracket.salary) {
    // 최고구간 초과분에 대해 마지막 두 구간의 증가율 적용
    const secondLast = TAX_BRACKETS[TAX_BRACKETS.length - 2];
    const ratePerWon =
      (lastBracket.tax1 - secondLast.tax1) / (lastBracket.salary - secondLast.salary);
    return Math.round(lastBracket.tax1 + (salary - lastBracket.salary) * ratePerWon);
  }

  // 구간 사이 선형 보간
  for (let i = 1; i < TAX_BRACKETS.length; i++) {
    const lower = TAX_BRACKETS[i - 1];
    const upper = TAX_BRACKETS[i];

    if (salary <= upper.salary) {
      const ratio = (salary - lower.salary) / (upper.salary - lower.salary);
      return Math.round(lower.tax1 + ratio * (upper.tax1 - lower.tax1));
    }
  }

  return 0;
}

function calculateWithholding(salary: number, dependents: number): WithholdingResult {
  // 1인 기준 소득세 계산
  const baseTax = interpolateTax(salary);

  // 가족수에 따른 감면 적용
  const clampedDependents = Math.min(Math.max(dependents, 1), 5);
  const discountRate = DEPENDENT_DISCOUNT_RATES[clampedDependents] ?? 0;
  const incomeTax = Math.max(0, Math.round(baseTax * (1 - discountRate)));

  // 지방소득세 = 소득세 × 10%
  const localTax = Math.round(incomeTax * 0.1);
  const totalWithholding = incomeTax + localTax;

  return {
    급여: formatKRW(salary),
    공제대상가족수: dependents,
    소득세: formatKRW(incomeTax),
    지방소득세: formatKRW(localTax),
    원천징수합계: formatKRW(totalWithholding),
    salary,
    dependents,
    incomeTax,
    localTax,
    totalWithholding,
  };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs(): { salary: number; dependents: number } {
  const args = process.argv.slice(2);
  let salary = 0;
  let dependents = 1;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--salary":
        salary = Number(args[++i]);
        break;
      case "--dependents":
        dependents = Number(args[++i]);
        break;
    }
  }

  return { salary, dependents };
}

function main(): void {
  const { salary, dependents } = parseArgs();

  if (salary <= 0) {
    console.error("Usage: tsx scripts/calc-withholding.ts --salary <월급여> [--dependents <가족수>]");
    console.error("");
    console.error("Examples:");
    console.error("  tsx scripts/calc-withholding.ts --salary 3000000");
    console.error("  tsx scripts/calc-withholding.ts --salary 5000000 --dependents 3");
    process.exit(1);
  }

  const result = calculateWithholding(salary, dependents);
  console.log(JSON.stringify(result, null, 2));
}

main();
