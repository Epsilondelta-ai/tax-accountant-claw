import "dotenv/config";

// ─── Types ───────────────────────────────────────────────────────────────────

type TaxEventType = "vat" | "withholding" | "corporate" | "insurance" | "reporting";

interface TaxDeadline {
  type: TaxEventType;
  name: string;
  deadline: string;
  dDay: number;
  description: string;
  preparation: string;
}

// ─── 2026년 세무 일정 ────────────────────────────────────────────────────────

function generate2026Calendar(): TaxDeadline[] {
  const deadlines: Array<Omit<TaxDeadline, "dDay">> = [
    // ── 1월 ──
    {
      type: "withholding",
      name: "원천세 신고납부 (12월분)",
      deadline: "2026-01-12",
      description: "전월 원천징수한 소득세, 지방소득세 신고납부",
      preparation: "원천징수이행상황신고서, 급여대장, 원천징수영수증",
    },
    {
      type: "vat",
      name: "부가가치세 확정신고 (2기)",
      deadline: "2026-01-25",
      description: "7~12월 부가가치세 확정신고 및 납부",
      preparation: "매출·매입세금계산서, 신용카드매출전표, 현금영수증",
    },
    // ── 2월 ──
    {
      type: "withholding",
      name: "원천세 신고납부 (1월분)",
      deadline: "2026-02-10",
      description: "전월 원천징수한 소득세, 지방소득세 신고납부",
      preparation: "원천징수이행상황신고서, 급여대장",
    },
    {
      type: "insurance",
      name: "4대보험 납부 (1월분)",
      deadline: "2026-02-10",
      description: "국민연금, 건강보험, 고용보험, 산재보험 납부",
      preparation: "4대보험 고지서 확인",
    },
    // ── 3월 ──
    {
      type: "reporting",
      name: "지급명세서 제출 (근로·퇴직소득)",
      deadline: "2026-03-02",
      description: "전년도 근로소득, 퇴직소득 지급명세서 제출",
      preparation: "근로소득원천징수영수증, 퇴직소득원천징수영수증",
    },
    {
      type: "withholding",
      name: "원천세 신고납부 (2월분)",
      deadline: "2026-03-10",
      description: "전월 원천징수한 소득세, 지방소득세 신고납부",
      preparation: "원천징수이행상황신고서, 급여대장",
    },
    {
      type: "reporting",
      name: "지급명세서 제출 (사업·기타소득)",
      deadline: "2026-03-10",
      description: "전년도 사업소득, 기타소득 지급명세서 제출",
      preparation: "사업소득원천징수영수증, 기타소득원천징수영수증",
    },
    {
      type: "insurance",
      name: "4대보험 납부 (2월분)",
      deadline: "2026-03-10",
      description: "국민연금, 건강보험, 고용보험, 산재보험 납부",
      preparation: "4대보험 고지서 확인",
    },
    {
      type: "corporate",
      name: "법인세 신고납부 (12월 결산)",
      deadline: "2026-03-31",
      description: "12월 결산법인 법인세 확정신고 및 납부",
      preparation: "재무제표, 세무조정계산서, 법인세 신고서",
    },
    // ── 4월 ──
    {
      type: "withholding",
      name: "원천세 신고납부 (3월분)",
      deadline: "2026-04-10",
      description: "전월 원천징수한 소득세, 지방소득세 신고납부",
      preparation: "원천징수이행상황신고서, 급여대장",
    },
    {
      type: "insurance",
      name: "4대보험 납부 (3월분)",
      deadline: "2026-04-10",
      description: "국민연금, 건강보험, 고용보험, 산재보험 납부",
      preparation: "4대보험 고지서 확인",
    },
    {
      type: "vat",
      name: "부가가치세 예정신고 (1기)",
      deadline: "2026-04-25",
      description: "1~3월 부가가치세 예정신고 및 납부",
      preparation: "매출·매입세금계산서, 신용카드매출전표, 현금영수증",
    },
    // ── 5월 ──
    {
      type: "withholding",
      name: "원천세 신고납부 (4월분)",
      deadline: "2026-05-11",
      description: "전월 원천징수한 소득세, 지방소득세 신고납부",
      preparation: "원천징수이행상황신고서, 급여대장",
    },
    {
      type: "insurance",
      name: "4대보험 납부 (4월분)",
      deadline: "2026-05-11",
      description: "국민연금, 건강보험, 고용보험, 산재보험 납부",
      preparation: "4대보험 고지서 확인",
    },
    // ── 6월 ──
    {
      type: "withholding",
      name: "원천세 신고납부 (5월분)",
      deadline: "2026-06-10",
      description: "전월 원천징수한 소득세, 지방소득세 신고납부",
      preparation: "원천징수이행상황신고서, 급여대장",
    },
    {
      type: "insurance",
      name: "4대보험 납부 (5월분)",
      deadline: "2026-06-10",
      description: "국민연금, 건강보험, 고용보험, 산재보험 납부",
      preparation: "4대보험 고지서 확인",
    },
    // ── 7월 ──
    {
      type: "withholding",
      name: "원천세 신고납부 (6월분)",
      deadline: "2026-07-10",
      description: "전월 원천징수한 소득세, 지방소득세 신고납부",
      preparation: "원천징수이행상황신고서, 급여대장",
    },
    {
      type: "insurance",
      name: "4대보험 납부 (6월분)",
      deadline: "2026-07-10",
      description: "국민연금, 건강보험, 고용보험, 산재보험 납부",
      preparation: "4대보험 고지서 확인",
    },
    {
      type: "vat",
      name: "부가가치세 확정신고 (1기)",
      deadline: "2026-07-25",
      description: "1~6월 부가가치세 확정신고 및 납부",
      preparation: "매출·매입세금계산서, 신용카드매출전표, 현금영수증",
    },
    // ── 8월 ──
    {
      type: "withholding",
      name: "원천세 신고납부 (7월분)",
      deadline: "2026-08-10",
      description: "전월 원천징수한 소득세, 지방소득세 신고납부",
      preparation: "원천징수이행상황신고서, 급여대장",
    },
    {
      type: "insurance",
      name: "4대보험 납부 (7월분)",
      deadline: "2026-08-10",
      description: "국민연금, 건강보험, 고용보험, 산재보험 납부",
      preparation: "4대보험 고지서 확인",
    },
    {
      type: "corporate",
      name: "법인세 중간예납",
      deadline: "2026-08-31",
      description: "12월 결산법인 법인세 중간예납 신고납부",
      preparation: "중간예납세액 계산서, 가결산 재무제표 (선택)",
    },
    // ── 9월 ──
    {
      type: "withholding",
      name: "원천세 신고납부 (8월분)",
      deadline: "2026-09-10",
      description: "전월 원천징수한 소득세, 지방소득세 신고납부",
      preparation: "원천징수이행상황신고서, 급여대장",
    },
    {
      type: "insurance",
      name: "4대보험 납부 (8월분)",
      deadline: "2026-09-10",
      description: "국민연금, 건강보험, 고용보험, 산재보험 납부",
      preparation: "4대보험 고지서 확인",
    },
    // ── 10월 ──
    {
      type: "withholding",
      name: "원천세 신고납부 (9월분)",
      deadline: "2026-10-12",
      description: "전월 원천징수한 소득세, 지방소득세 신고납부",
      preparation: "원천징수이행상황신고서, 급여대장",
    },
    {
      type: "insurance",
      name: "4대보험 납부 (9월분)",
      deadline: "2026-10-12",
      description: "국민연금, 건강보험, 고용보험, 산재보험 납부",
      preparation: "4대보험 고지서 확인",
    },
    {
      type: "vat",
      name: "부가가치세 예정신고 (2기)",
      deadline: "2026-10-25",
      description: "7~9월 부가가치세 예정신고 및 납부",
      preparation: "매출·매입세금계산서, 신용카드매출전표, 현금영수증",
    },
    // ── 11월 ──
    {
      type: "withholding",
      name: "원천세 신고납부 (10월분)",
      deadline: "2026-11-10",
      description: "전월 원천징수한 소득세, 지방소득세 신고납부",
      preparation: "원천징수이행상황신고서, 급여대장",
    },
    {
      type: "insurance",
      name: "4대보험 납부 (10월분)",
      deadline: "2026-11-10",
      description: "국민연금, 건강보험, 고용보험, 산재보험 납부",
      preparation: "4대보험 고지서 확인",
    },
    // ── 12월 ──
    {
      type: "withholding",
      name: "원천세 신고납부 (11월분)",
      deadline: "2026-12-10",
      description: "전월 원천징수한 소득세, 지방소득세 신고납부",
      preparation: "원천징수이행상황신고서, 급여대장",
    },
    {
      type: "insurance",
      name: "4대보험 납부 (11월분)",
      deadline: "2026-12-10",
      description: "국민연금, 건강보험, 고용보험, 산재보험 납부",
      preparation: "4대보험 고지서 확인",
    },
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return deadlines.map((d) => {
    const deadlineDate = new Date(d.deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffMs = deadlineDate.getTime() - today.getTime();
    const dDay = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return { ...d, dDay };
  });
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs(): {
  next: boolean;
  month: string;
  type: TaxEventType | "";
  count: number;
} {
  const args = process.argv.slice(2);
  let next = false;
  let month = "";
  let type: TaxEventType | "" = "";
  let count = 5;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--next":
        next = true;
        break;
      case "--month":
        month = args[++i] ?? "";
        break;
      case "--type":
        type = (args[++i] ?? "") as TaxEventType;
        break;
      case "--count":
        count = Number(args[++i]) || 5;
        break;
    }
  }

  return { next, month, type, count };
}

function main(): void {
  const { next, month, type, count } = parseArgs();
  let calendar = generate2026Calendar();

  // 유형별 필터
  if (type) {
    calendar = calendar.filter((d) => d.type === type);
  }

  // 월별 필터
  if (month) {
    calendar = calendar.filter((d) => d.deadline.startsWith(month));
  }

  // 다음 마감일
  if (next) {
    const upcoming = calendar
      .filter((d) => d.dDay >= 0)
      .sort((a, b) => a.dDay - b.dDay)
      .slice(0, count);

    if (upcoming.length === 0) {
      console.log(JSON.stringify({ message: "2026년 남은 세무 일정이 없습니다." }, null, 2));
      return;
    }

    console.log(JSON.stringify(upcoming, null, 2));
    return;
  }

  if (!month && !type) {
    console.error("Usage: tsx scripts/tax-calendar.ts [options]");
    console.error("");
    console.error("Options:");
    console.error("  --next              다음 마감일 조회 (기본 5개)");
    console.error("  --count <N>         조회할 일정 수 (--next와 함께 사용)");
    console.error("  --month YYYY-MM     특정 월의 일정 조회");
    console.error("  --type <type>       유형별 필터 (vat|withholding|corporate|insurance|reporting)");
    console.error("");
    console.error("Examples:");
    console.error("  tsx scripts/tax-calendar.ts --next");
    console.error("  tsx scripts/tax-calendar.ts --next --count 3");
    console.error("  tsx scripts/tax-calendar.ts --month 2026-03");
    console.error("  tsx scripts/tax-calendar.ts --type vat");
    process.exit(1);
  }

  console.log(JSON.stringify(calendar, null, 2));
}

main();
