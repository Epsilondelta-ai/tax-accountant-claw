import "dotenv/config";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ParsedCardNotification {
  cardCompany: string;
  type: "승인" | "취소" | "unknown";
  amount: number;
  vendor: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  cardHolder?: string;
  approvalNumber?: string;
  installment?: number; // 할부 개월 수, 0 = 일시불
  cumulative?: number;
  balance?: number;
  raw: string;
}

// ─── Card Company Detection ──────────────────────────────────────────────────

const CARD_COMPANY_KEYWORDS: Array<{ name: string; keywords: string[] }> = [
  { name: "삼성카드", keywords: ["삼성카드", "삼성체크", "삼성법인", "삼성가족카드"] },
  { name: "신한카드", keywords: ["신한카드", "신한체크"] },
  { name: "KB국민카드", keywords: ["KB국민카드", "국민카드", "KB카드", "KB*카드", "[KB]"] },
  { name: "현대카드", keywords: ["현대카드"] },
  { name: "롯데카드", keywords: ["롯데카드"] },
  { name: "하나카드", keywords: ["하나카드", "하나SK", "KEB하나", "하나("] },
  { name: "BC카드", keywords: ["BC카드", "비씨카드", "BC("] },
  { name: "NH농협카드", keywords: ["NH카드", "농협카드", "NH농협", "농협BC"] },
  { name: "우리카드", keywords: ["우리카드"] },
  { name: "씨티카드", keywords: ["씨티카드", "씨티BC"] },
];

// ─── Field Extractors ────────────────────────────────────────────────────────

export function detectCardCompany(text: string): string {
  for (const { name, keywords } of CARD_COMPANY_KEYWORDS) {
    for (const kw of keywords) {
      if (text.includes(kw)) return name;
    }
  }
  return "unknown";
}

function detectType(text: string): "승인" | "취소" | "unknown" {
  if (text.includes("취소")) return "취소";
  if (text.includes("승인") || text.includes("출금") || text.includes("사용")) return "승인";
  return "unknown";
}

export function extractAmount(text: string): number {
  // 누적/잔액 금액은 제외하고 메인 금액만 추출
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("누적") || trimmed.startsWith("잔액")) continue;
    if (trimmed.includes("누적")) continue;

    // "123,456원" or "123,456원(일시불)" 패턴
    const match = trimmed.match(/^([\d,]+)\s*원/);
    if (match) {
      return parseInt(match[1].replace(/,/g, ""), 10);
    }

    // "(일시불)123,456원" 패턴 (신한카드)
    const match2 = trimmed.match(/\(일시불\)\s*([\d,]+)\s*원/);
    if (match2) {
      return parseInt(match2[1].replace(/,/g, ""), 10);
    }

    // "일시불 123,456원" or "일시불123,456원" 패턴
    const match3 = trimmed.match(/일시불\s*([\d,]+)\s*원/);
    if (match3) {
      return parseInt(match3[1].replace(/,/g, ""), 10);
    }

    // 줄 중간의 "123,456원 " (공백 뒤에 가맹점 등)
    const match4 = trimmed.match(/([\d,]+)\s*원[\s(]/);
    if (match4 && !trimmed.includes("누적")) {
      return parseInt(match4[1].replace(/,/g, ""), 10);
    }
  }

  // Fallback: 전체 텍스트에서 첫 번째 금액 (누적/잔액 제외)
  const cleaned = text.replace(/누적[\s:\-]?[\d,]+원?/g, "").replace(/잔액[\d,\s]+원?/g, "");
  const fallback = cleaned.match(/([\d,]+)\s*원/);
  if (fallback) {
    return parseInt(fallback[1].replace(/,/g, ""), 10);
  }

  return 0;
}

export function extractDateTime(text: string): { month: number; day: number; hour: number; minute: number } | null {
  // MM/DD HH:MM 패턴 (가장 일반적)
  const match = text.match(/(\d{1,2})\/(\d{1,2})\s+(\d{2}):(\d{2})/);
  if (match) {
    return {
      month: parseInt(match[1], 10),
      day: parseInt(match[2], 10),
      hour: parseInt(match[3], 10),
      minute: parseInt(match[4], 10),
    };
  }

  // MM월DD일HH:MM 패턴
  const match2 = text.match(/(\d{1,2})월\s*(\d{1,2})일\s*(\d{2}):(\d{2})/);
  if (match2) {
    return {
      month: parseInt(match2[1], 10),
      day: parseInt(match2[2], 10),
      hour: parseInt(match2[3], 10),
      minute: parseInt(match2[4], 10),
    };
  }

  // MM/DD만 있는 경우
  const match3 = text.match(/(\d{1,2})\/(\d{1,2})/);
  if (match3) {
    return {
      month: parseInt(match3[1], 10),
      day: parseInt(match3[2], 10),
      hour: 0,
      minute: 0,
    };
  }

  return null;
}

function extractCardHolder(text: string): string | undefined {
  const match = text.match(/([가-힣*]{2,4})님/);
  return match?.[1];
}

function extractCumulative(text: string): number | undefined {
  const match = text.match(/누적[\s:\-]?([\d,]+)\s*원?/);
  return match ? parseInt(match[1].replace(/,/g, ""), 10) : undefined;
}

function extractBalance(text: string): number | undefined {
  const match = text.match(/잔액\s*([\d,]+)\s*원?/);
  return match ? parseInt(match[1].replace(/,/g, ""), 10) : undefined;
}

function extractInstallment(text: string): number | undefined {
  if (text.includes("일시불")) return 0;
  const match = text.match(/(\d{1,2})\s*개월/);
  return match ? parseInt(match[1], 10) : undefined;
}

function extractApprovalNumber(text: string): string | undefined {
  const match = text.match(/승인번호?\s*:?\s*(\d{6,10})/);
  return match?.[1];
}

function inferYear(month: number): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (month === 12 && currentMonth <= 2) return currentYear - 1;
  return currentYear;
}

// ─── Vendor Extraction ───────────────────────────────────────────────────────

export function extractVendor(text: string): string {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const skipPatterns = [
    /^\[Web발신\]$/,
    /^\(Web발신\)$/,
    /^\[.*카드\]/,
    /카드/,
    /은행/,
    /님\s*(승인|취소|사용|출금)?$/,
    /^\d{1,2}\/\d{1,2}\s+\d{2}:\d{2}$/,
    /^\d{1,2}\/\d{1,2}$/,
    /^[\d,]+\s*원/,
    /^일시불/,
    /^\(일시불\)/,
    /^누적/,
    /^잔액/,
    /^승인$/,
    /^취소$/,
    /^체크카드/,
    /^\d{6,}/,
    /^[*\d]{4,}$/,
  ];

  for (const line of lines) {
    const isKnownField = skipPatterns.some((p) => p.test(line));
    if (isKnownField) continue;

    if (line.length >= 2) {
      const cleaned = line.replace(/\s*(취소|사용|승인)\s*$/, "").trim();
      if (cleaned.length >= 2) return cleaned;
    }
  }

  // 한줄 포맷 fallback
  const oneline = text.replace(/\n/g, " ");
  const vendorMatch = oneline.match(
    /[\d,]+\s*원\s+([가-힣a-zA-Z0-9()\s]{2,20}?)(?:\s+누적|\s*$)/
  );
  if (vendorMatch) return vendorMatch[1].trim();

  return "unknown";
}

// ─── Main Parser ─────────────────────────────────────────────────────────────

export function parseCardNotification(text: string): ParsedCardNotification | null {
  if (!text || text.trim().length === 0) return null;

  const cardCompany = detectCardCompany(text);
  const type = detectType(text);
  const amount = extractAmount(text);
  const dateTime = extractDateTime(text);
  const cardHolder = extractCardHolder(text);
  const vendor = extractVendor(text);
  const cumulative = extractCumulative(text);
  const balance = extractBalance(text);
  const installment = extractInstallment(text);
  const approvalNumber = extractApprovalNumber(text);

  if (amount === 0) return null;

  const now = new Date();
  let date: string;
  let time: string;

  if (dateTime) {
    const year = inferYear(dateTime.month);
    date = `${year}-${String(dateTime.month).padStart(2, "0")}-${String(dateTime.day).padStart(2, "0")}`;
    time = `${String(dateTime.hour).padStart(2, "0")}:${String(dateTime.minute).padStart(2, "0")}`;
  } else {
    date = now.toISOString().slice(0, 10);
    time = now.toTimeString().slice(0, 5);
  }

  return {
    cardCompany,
    type,
    amount,
    vendor,
    date,
    time,
    cardHolder,
    approvalNumber,
    installment,
    cumulative,
    balance,
    raw: text,
  };
}

// ─── Formatting ──────────────────────────────────────────────────────────────

function formatKRW(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}원`;
}

function formatResult(parsed: ParsedCardNotification): Record<string, unknown> {
  return {
    카드사: parsed.cardCompany,
    유형: parsed.type,
    금액: formatKRW(parsed.amount),
    가맹점: parsed.vendor,
    날짜: parsed.date,
    시간: parsed.time,
    ...(parsed.cardHolder && { 카드소유자: parsed.cardHolder }),
    ...(parsed.approvalNumber && { 승인번호: parsed.approvalNumber }),
    ...(parsed.installment !== undefined && {
      할부: parsed.installment === 0 ? "일시불" : `${parsed.installment}개월`,
    }),
    ...(parsed.cumulative !== undefined && { 누적사용액: formatKRW(parsed.cumulative) }),
    ...(parsed.balance !== undefined && { 잔액: formatKRW(parsed.balance) }),
    amount: parsed.amount,
    vendor: parsed.vendor,
    date: parsed.date,
    time: parsed.time,
    cardCompany: parsed.cardCompany,
    type: parsed.type,
  };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs(): { text: string } {
  const args = process.argv.slice(2);
  let text = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--text") {
      text = args[++i] ?? "";
    }
  }

  if (!text && args.length > 0 && !args[0].startsWith("--")) {
    text = args.join(" ");
  }

  return { text };
}

function main(): void {
  const { text } = parseArgs();

  if (!text) {
    console.error("Usage: tsx scripts/parse-card-notification.ts --text <카드 승인 문자>");
    console.error("");
    console.error("Examples:");
    console.error('  tsx scripts/parse-card-notification.ts --text "[Web발신] [신한카드] 홍*동님 02/28 15:30 45,000원 스타벅스강남점 승인"');
    process.exit(1);
    return;
  }

  const parsed = parseCardNotification(text);

  if (!parsed) {
    console.error(
      JSON.stringify({ error: true, message: "카드 승인 문자를 파싱할 수 없습니다.", raw: text }, null, 2)
    );
    process.exit(1);
    return;
  }

  console.log(JSON.stringify(formatResult(parsed), null, 2));
}

// CLI 모드: 직접 실행될 때만 main() 호출 (import 시에는 실행하지 않음)
const isDirectRun = process.argv[1]?.includes("parse-card-notification");
if (isDirectRun) {
  main();
}
