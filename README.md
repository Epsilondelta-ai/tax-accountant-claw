# tax-accountant-claw

5인 미만 한국 법인을 위한 [OpenClaw](https://github.com/openclaw/openclaw) 세무 어시스턴트 스킬.

세무사 없이도 Telegram, Slack, Discord 등 원하는 채널에서 **"이번 달 원천세 얼마야?"** 같은 질문을 던지면, 이카운트 ERP 데이터를 기반으로 즉시 답변합니다.

## 기능

| 기능 | 설명 |
|---|---|
| **부가세 계산** | 이카운트 매출/매입 전표 → 매출세액-매입세액 자동 산출 |
| **원천세 계산** | 급여 데이터 → 간이세액표 기반 소득세+주민세 산출 |
| **법인세 추정** | 당기순이익 → 2026년 누진세율 적용 세액 추정 |
| **4대보험 계산** | 월 보수액 → 근로자/사업주 분담액 산출 (2026년 요율) |
| **세무 일정 관리** | 다음 기한 D-day, 월별 브리핑, 가산세 경고 |
| **홈택스 신고 안내** | 부가세/원천세/법인세 신고 절차 단계별 가이드 |
| **자동 알림** | 크론잡으로 원천세(매월), 부가세(분기), 법인세(연) 기한 사전 알림 |

## 빠른 시작

### 1. OpenClaw 설치

```bash
npm install -g openclaw@latest
openclaw onboard
```

### 2. 스킬 설치

```bash
# 방법 A: 직접 복사
git clone https://github.com/Epsilondelta-ai/tax-accountant-claw.git
cp -r tax-accountant-claw ~/.openclaw/skills/tax-accountant/

# 방법 B: 심볼릭 링크 (개발용)
git clone https://github.com/Epsilondelta-ai/tax-accountant-claw.git
ln -s "$(pwd)/tax-accountant-claw" ~/.openclaw/skills/tax-accountant
```

### 3. 이카운트 API 설정

```bash
cd ~/.openclaw/skills/tax-accountant
cp .env.example .env
```

`.env` 파일을 열어 이카운트 인증 정보를 입력합니다:

```env
ECOUNT_COM_CODE=회사코드
ECOUNT_USER_ID=사용자ID
ECOUNT_API_CERT_KEY=API인증키
ECOUNT_ZONE=존코드
```

> 이카운트 API 키는 [시스템관리 > 보안관리 > API 인증키 관리]에서 발급받을 수 있습니다.

### 4. 의존성 설치

```bash
npm install
```

### 5. 스킬 확인 및 사용

```bash
openclaw skills list  # tax-accountant가 보여야 함
```

이제 연결된 채널(Telegram, Slack 등)에서 대화하면 됩니다:

```
나: 이번 분기 부가세 얼마야?
봇: 이카운트에서 1~3월 데이터를 조회하겠습니다...
    매출세액: 5,000,000원
    매입세액: 3,000,000원
    납부세액: 2,000,000원
    신고 기한: 4월 25일 (D-28)
```

## 스크립트 직접 실행

OpenClaw 없이도 스크립트를 직접 실행할 수 있습니다:

```bash
# 법인세 추정 (과세표준 1.5억)
npx tsx scripts/calc-corporate-tax.ts --income 150000000

# 4대보험 계산 (월급 300만원)
npx tsx scripts/calc-insurance.ts --salary 3000000

# 원천세 계산 (월급 300만원, 부양가족 1인)
npx tsx scripts/calc-withholding.ts --salary 3000000 --dependents 1

# 부가세 계산 (매출 5천만, 매입 3천만)
npx tsx scripts/calc-vat.ts --sales-amount 50000000 --purchase-amount 30000000

# 다음 세무 기한 확인
npx tsx scripts/tax-calendar.ts --next

# 이번 달 세무 일정
npx tsx scripts/tax-calendar.ts --month 2026-03

# 홈택스 부가세 신고 가이드
npx tsx scripts/hometax-guide.ts --type vat
```

## 자동 알림 설정 (크론잡)

세무 기한을 놓치지 않도록 자동 알림을 설정할 수 있습니다.
자세한 내용은 [cron-setup.md](cron-setup.md)를 참고하세요.

```bash
# 매월 1일 — 이번 달 세무 브리핑
openclaw cron add --name "월간 세무 브리핑" --cron "0 9 1 * *" --tz "Asia/Seoul" \
  --session isolated --message "이번 달 세무 일정을 브리핑해주세요." --announce

# 매월 5일 — 원천세 기한 알림
openclaw cron add --name "원천세 알림" --cron "0 9 5 * *" --tz "Asia/Seoul" \
  --session isolated --message "원천세 신고 기한이 5일 남았습니다." --announce
```

## 프로젝트 구조

```
tax-accountant-claw/
├── SKILL.md                    # OpenClaw 에이전트 지시서
├── cron-setup.md               # 크론잡 설정 가이드
├── scripts/
│   ├── ecount-client.ts        # 이카운트 ERP API 클라이언트
│   ├── calc-vat.ts             # 부가세 계산기
│   ├── calc-withholding.ts     # 원천세 계산기
│   ├── calc-corporate-tax.ts   # 법인세 계산기
│   ├── calc-insurance.ts       # 4대보험 계산기
│   ├── tax-calendar.ts         # 세무 일정 조회
│   └── hometax-guide.ts        # 홈택스 신고 가이드
└── references/
    ├── tax-rates-2026.md       # 2026 법인세 세율표
    ├── insurance-rates-2026.md # 2026 4대보험 요율표
    ├── withholding-table-2026.md # 근로소득 간이세액표
    ├── vat-rules.md            # 부가세 신고 규칙
    └── tax-calendar-2026.md    # 2026 세무 캘린더
```

## 2026년 주요 세율

| 항목 | 세율 |
|---|---|
| 법인세 (2억 이하) | 10% (전년 대비 1%p 인상) |
| 법인세 (2~200억) | 20% |
| 부가가치세 | 10% |
| 국민연금 | 9.5% (전년 대비 0.5%p 인상) |
| 건강보험 | 7.19% |
| 고용보험 | 1.8% |

> 자세한 세율표는 `references/` 디렉토리를 참고하세요.

## 한계점

| 가능 | 불가능 |
|---|---|
| 부가세·원천세·법인세 계산 | 홈택스 자동 전자신고 (API 없음) |
| 이카운트 데이터 자동 조회 | 세무조사 대응 |
| 세무 일정 자동 알림 | 복잡한 세무조정 (조정계산서 등) |
| 4대보험 금액 계산 | 개인 소득세 (법인 전용) |
| 홈택스 신고 절차 안내 | 한국 외 세무 |

> 복잡한 세무 판단이 필요한 경우 세무사 상담을 추천합니다.
> 기장대리 비용은 월 10~15만원 수준으로, 이 봇과 병행하면 대표가 세무에 쓰는 시간을 거의 0으로 줄일 수 있습니다.

## 라이선스

MIT
