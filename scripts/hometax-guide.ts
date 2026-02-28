import "dotenv/config";

// ─── Types ───────────────────────────────────────────────────────────────────

type GuideType = "vat" | "withholding" | "corporate";

interface GuideStep {
  step: number;
  action: string;
  details: string;
}

interface FilingGuide {
  type: GuideType;
  title: string;
  url: string;
  requiredDocuments: string[];
  steps: GuideStep[];
}

// ─── Guides ──────────────────────────────────────────────────────────────────

function getVatGuide(): FilingGuide {
  return {
    type: "vat",
    title: "부가가치세 신고 (홈택스)",
    url: "https://www.hometax.go.kr",
    requiredDocuments: [
      "매출세금계산서 합계표",
      "매입세금계산서 합계표",
      "신용카드매출전표 등 수령명세서",
      "현금영수증 매출·매입 내역",
      "수출실적명세서 (해당시)",
      "대손세액공제 신고서 (해당시)",
    ],
    steps: [
      {
        step: 1,
        action: "홈택스 로그인",
        details:
          "https://www.hometax.go.kr 접속 → 공동인증서/간편인증으로 로그인",
      },
      {
        step: 2,
        action: "부가가치세 신고 메뉴 진입",
        details:
          "상단 메뉴 [신고/납부] → [세금신고] → [부가가치세] → [일반과세자 신고]",
      },
      {
        step: 3,
        action: "기본정보 확인",
        details:
          "사업자등록번호, 상호, 대표자명, 신고기간 확인. 신고유형(확정/예정) 선택",
      },
      {
        step: 4,
        action: "매출세액 입력",
        details:
          "세금계산서 발급분, 신용카드/현금영수증 발행분, 기타 매출 금액 입력. " +
          "[세금계산서 합계표 불러오기] 버튼으로 전자세금계산서 자동 반영",
      },
      {
        step: 5,
        action: "매입세액 입력",
        details:
          "세금계산서 수취분, 신용카드/현금영수증 매입분 입력. " +
          "[매입세금계산서 합계표 불러오기]로 자동 반영. 불공제 매입세액 확인",
      },
      {
        step: 6,
        action: "경감·공제세액 입력",
        details:
          "신용카드매출전표 발행 세액공제, 전자신고 세액공제(1만원), " +
          "기타 해당 공제항목 입력",
      },
      {
        step: 7,
        action: "납부(환급)세액 확인",
        details:
          "자동 계산된 납부세액 또는 환급세액 확인. " +
          "과소신고·무신고 가산세 해당여부 점검",
      },
      {
        step: 8,
        action: "신고서 제출",
        details:
          "[신고서 제출하기] 클릭 → 접수번호 확인. " +
          "납부세액이 있으면 [납부하기]에서 즉시 납부 또는 가상계좌 납부",
      },
    ],
  };
}

function getWithholdingGuide(): FilingGuide {
  return {
    type: "withholding",
    title: "원천세 신고 (홈택스)",
    url: "https://www.hometax.go.kr",
    requiredDocuments: [
      "원천징수이행상황신고서",
      "급여대장 (급여명세서)",
      "소득자별 원천징수영수증",
      "퇴직소득 원천징수영수증 (해당시)",
      "사업소득 원천징수영수증 (해당시)",
    ],
    steps: [
      {
        step: 1,
        action: "홈택스 로그인",
        details:
          "https://www.hometax.go.kr 접속 → 공동인증서/간편인증으로 로그인",
      },
      {
        step: 2,
        action: "원천세 신고 메뉴 진입",
        details:
          "상단 메뉴 [신고/납부] → [세금신고] → [원천세] → [원천세 신고(정기신고)]",
      },
      {
        step: 3,
        action: "기본정보 입력",
        details:
          "사업자등록번호 확인, 귀속연월(급여 지급 월) 선택, " +
          "지급연월(실제 지급 월) 선택, 신고구분(원천징수/반기별) 선택",
      },
      {
        step: 4,
        action: "소득종류별 인원·금액 입력",
        details:
          "근로소득: 인원수, 총지급액, 소득세, 지방소득세 입력. " +
          "사업소득(3.3%): 해당시 인원수, 총지급액, 소득세, 지방소득세 입력. " +
          "퇴직소득, 기타소득 등 해당항목 입력",
      },
      {
        step: 5,
        action: "환급신청 확인 (해당시)",
        details:
          "연말정산 환급액이 있는 경우, 조정환급액 입력. " +
          "당월 원천세에서 차감 또는 환급 신청",
      },
      {
        step: 6,
        action: "납부세액 확인 및 제출",
        details:
          "총 납부세액 확인 → [신고서 제출하기] 클릭 → 접수번호 확인. " +
          "매월 10일까지 신고·납부 완료 필수 (공휴일 시 다음 영업일)",
      },
      {
        step: 7,
        action: "납부",
        details:
          "[납부하기] → 전자납부(계좌이체) 또는 가상계좌 납부. " +
          "지방소득세는 위택스(https://www.wetax.go.kr)에서 별도 신고·납부",
      },
    ],
  };
}

function getCorporateGuide(): FilingGuide {
  return {
    type: "corporate",
    title: "법인세 신고 (홈택스)",
    url: "https://www.hometax.go.kr",
    requiredDocuments: [
      "재무상태표 (대차대조표)",
      "손익계산서",
      "이익잉여금처분계산서",
      "세무조정계산서",
      "법인세 과세표준 및 세액신고서",
      "주요 세무조정 명세서 (감가상각비, 접대비, 기부금 등)",
      "주주명부 및 지분변동명세서",
      "특수관계인 거래명세서 (해당시)",
    ],
    steps: [
      {
        step: 1,
        action: "홈택스 로그인",
        details:
          "https://www.hometax.go.kr 접속 → 법인 공동인증서로 로그인",
      },
      {
        step: 2,
        action: "법인세 신고 메뉴 진입",
        details:
          "상단 메뉴 [신고/납부] → [세금신고] → [법인세] → [법인세 신고]",
      },
      {
        step: 3,
        action: "기본사항 입력",
        details:
          "사업자등록번호, 법인명, 사업연도(결산기간), " +
          "법인유형(중소기업/일반법인), 업종코드 확인",
      },
      {
        step: 4,
        action: "재무제표 입력",
        details:
          "재무상태표, 손익계산서 금액 입력. " +
          "이카운트 등 회계프로그램에서 표준재무제표 XML 변환 후 업로드 가능",
      },
      {
        step: 5,
        action: "세무조정 입력",
        details:
          "익금산입·손금불산입 항목 입력 (접대비한도초과, 감가상각비 시인부족 등). " +
          "손금산입·익금불산입 항목 입력. 소득금액조정합계표 작성",
      },
      {
        step: 6,
        action: "과세표준 및 세액 계산",
        details:
          "과세표준 = 각사업연도소득 - 이월결손금 - 비과세소득 - 소득공제. " +
          "세율 적용: 2억 이하 10%, 2~200억 20%, 200~3000억 22%, 3000억 초과 25%",
      },
      {
        step: 7,
        action: "세액공제·감면 입력",
        details:
          "중소기업 세액감면, 연구인력개발비 세액공제, " +
          "고용증대 세액공제 등 해당 항목 입력",
      },
      {
        step: 8,
        action: "기납부세액 입력",
        details:
          "중간예납세액, 수시부과세액, 원천징수세액 입력. " +
          "차감납부세액 = 산출세액 - 세액공제 - 기납부세액",
      },
      {
        step: 9,
        action: "첨부서류 업로드",
        details:
          "세무조정계산서, 재무제표, 주주명부 등 필수 첨부서류 PDF/XML 업로드",
      },
      {
        step: 10,
        action: "신고서 제출 및 납부",
        details:
          "[신고서 제출하기] 클릭 → 접수번호 확인. " +
          "3월 31일까지 신고·납부 완료 (12월 결산법인 기준). " +
          "지방소득세는 4월 30일까지 위택스에서 별도 신고·납부",
      },
    ],
  };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const VALID_TYPES: GuideType[] = ["vat", "withholding", "corporate"];

function parseArgs(): { type: GuideType | "" } {
  const args = process.argv.slice(2);
  let type: GuideType | "" = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--type") {
      type = (args[++i] ?? "") as GuideType;
    }
  }

  return { type };
}

function main(): void {
  const { type } = parseArgs();

  if (!type || !VALID_TYPES.includes(type)) {
    console.error("Usage: tsx scripts/hometax-guide.ts --type <vat|withholding|corporate>");
    console.error("");
    console.error("Types:");
    console.error("  vat           부가가치세 신고 가이드");
    console.error("  withholding   원천세 신고 가이드");
    console.error("  corporate     법인세 신고 가이드");
    process.exit(1);
  }

  const validType: GuideType = type;
  const guides: Record<GuideType, () => FilingGuide> = {
    vat: getVatGuide,
    withholding: getWithholdingGuide,
    corporate: getCorporateGuide,
  };

  const guide = guides[validType]();
  console.log(JSON.stringify(guide, null, 2));
}

main();
