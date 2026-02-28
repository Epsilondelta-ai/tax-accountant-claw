import "dotenv/config";

// ─── Types ───────────────────────────────────────────────────────────────────

interface InsurancePortion {
  국민연금: string;
  건강보험: string;
  장기요양보험: string;
  고용보험: string;
  합계: string;
  pension: number;
  health: number;
  longTermCare: number;
  employment: number;
  total: number;
}

interface InsuranceResult {
  월보수액: string;
  salary: number;
  근로자부담: InsurancePortion;
  사업주부담: InsurancePortion;
  employee: InsurancePortion;
  employer: InsurancePortion;
  총합계: string;
  grandTotal: number;
}

// ─── 2026년 4대보험 요율 ─────────────────────────────────────────────────────

const RATES = {
  // 국민연금: 전체 9.5% (각각 4.75%)
  pension: {
    employee: 0.0475,
    employer: 0.0475,
  },
  // 건강보험: 전체 7.19% (각각 3.595%)
  health: {
    employee: 0.03595,
    employer: 0.03595,
  },
  // 장기요양보험: 건보료의 13.14%
  longTermCare: {
    rate: 0.1314,
  },
  // 고용보험: 전체 1.8% (각각 0.9%)
  employment: {
    employee: 0.009,
    employer: 0.009,
  },
} as const;

// 국민연금 상한/하한 (2026년 기준)
const PENSION_LIMITS = {
  min: 370_000, // 하한 기준소득월액
  max: 6_170_000, // 상한 기준소득월액
} as const;

// ─── Formatting ──────────────────────────────────────────────────────────────

function formatKRW(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}원`;
}

// ─── Calculation ─────────────────────────────────────────────────────────────

function calculatePortion(
  salary: number,
  side: "employee" | "employer"
): InsurancePortion {
  // 국민연금: 기준소득월액 상·하한 적용
  const pensionBase = Math.min(Math.max(salary, PENSION_LIMITS.min), PENSION_LIMITS.max);
  const pension = Math.round(pensionBase * RATES.pension[side]);

  // 건강보험
  const health = Math.round(salary * RATES.health[side]);

  // 장기요양보험: 건보료 × 13.14%
  const longTermCare = Math.round(health * RATES.longTermCare.rate);

  // 고용보험
  const employment = Math.round(salary * RATES.employment[side]);

  const total = pension + health + longTermCare + employment;

  return {
    국민연금: formatKRW(pension),
    건강보험: formatKRW(health),
    장기요양보험: formatKRW(longTermCare),
    고용보험: formatKRW(employment),
    합계: formatKRW(total),
    pension,
    health,
    longTermCare,
    employment,
    total,
  };
}

function calculateInsurance(salary: number): InsuranceResult {
  const employee = calculatePortion(salary, "employee");
  const employer = calculatePortion(salary, "employer");
  const grandTotal = employee.total + employer.total;

  return {
    월보수액: formatKRW(salary),
    salary,
    근로자부담: employee,
    사업주부담: employer,
    employee,
    employer,
    총합계: formatKRW(grandTotal),
    grandTotal,
  };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs(): { salary: number } {
  const args = process.argv.slice(2);
  let salary = 0;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--salary") {
      salary = Number(args[++i]);
    }
  }

  return { salary };
}

function main(): void {
  const { salary } = parseArgs();

  if (salary <= 0) {
    console.error("Usage: tsx scripts/calc-insurance.ts --salary <월보수액>");
    console.error("");
    console.error("Examples:");
    console.error("  tsx scripts/calc-insurance.ts --salary 3000000");
    console.error("  tsx scripts/calc-insurance.ts --salary 5000000");
    process.exit(1);
  }

  const result = calculateInsurance(salary);
  console.log(JSON.stringify(result, null, 2));
}

main();
