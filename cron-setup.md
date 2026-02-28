# OpenClaw 세무 크론잡 설정 가이드

이 문서는 `tax-accountant` 스킬의 세무 일정 자동 알림을 설정하는 방법을 안내합니다.

## 사전 요구사항

1. OpenClaw Gateway가 로컬에서 실행 중이어야 합니다
2. 최소 하나의 채널(Telegram/Slack/Discord 등)이 연결되어 있어야 합니다
3. `tax-accountant` 스킬이 설치되어 있어야 합니다

## 설치 확인

```bash
# OpenClaw 상태 확인
openclaw status

# 스킬 목록에서 tax-accountant 확인
openclaw skills list | grep tax-accountant

# 크론 스케줄러 상태 확인
openclaw cron list
```

## 크론잡 등록

### 1. 월간 세무 브리핑 (매월 1일)

매월 1일 오전 9시, 이번 달 전체 세무 일정을 브리핑합니다.

```bash
openclaw cron add \
  --name "월간 세무 브리핑" \
  --cron "0 9 1 * *" \
  --tz "Asia/Seoul" \
  --session isolated \
  --message "이번 달 세무 일정을 전체 확인하고 브리핑해주세요. 각 기한별 D-day와 준비사항을 포함해주세요." \
  --announce
```

### 2. 원천세 알림 (매월 5일)

매월 10일이 원천세 신고·납부 기한. 5일 전인 5일에 알림.

```bash
openclaw cron add \
  --name "원천세 알림" \
  --cron "0 9 5 * *" \
  --tz "Asia/Seoul" \
  --session isolated \
  --message "원천세 신고 기한이 5일 남았습니다 (매월 10일). 이카운트에서 전월 급여 데이터를 확인하고 원천세를 계산해주세요." \
  --announce
```

### 3. 부가세 알림 (분기별, 기한 2주 전)

```bash
# 1기 확정 (7/25 기한) → 7/11 알림
openclaw cron add \
  --name "부가세 1기확정 알림" \
  --cron "0 9 11 7 *" \
  --tz "Asia/Seoul" \
  --session isolated \
  --message "1기 확정 부가세 신고 기한이 2주 남았습니다 (7월 25일). 이카운트에서 1~6월 매출/매입 데이터를 확인하고 납부세액을 계산해주세요." \
  --announce

# 2기 확정 (1/25 기한) → 1/11 알림
openclaw cron add \
  --name "부가세 2기확정 알림" \
  --cron "0 9 11 1 *" \
  --tz "Asia/Seoul" \
  --session isolated \
  --message "2기 확정 부가세 신고 기한이 2주 남았습니다 (1월 25일). 이카운트에서 7~12월 매출/매입 데이터를 확인하고 납부세액을 계산해주세요." \
  --announce

# 1기 예정 (4/25 기한) → 4/11 알림
openclaw cron add \
  --name "부가세 1기예정 알림" \
  --cron "0 9 11 4 *" \
  --tz "Asia/Seoul" \
  --session isolated \
  --message "1기 예정 부가세 신고 기한이 2주 남았습니다 (4월 25일)." \
  --announce

# 2기 예정 (10/25 기한) → 10/11 알림
openclaw cron add \
  --name "부가세 2기예정 알림" \
  --cron "0 9 11 10 *" \
  --tz "Asia/Seoul" \
  --session isolated \
  --message "2기 예정 부가세 신고 기한이 2주 남았습니다 (10월 25일)." \
  --announce
```

### 4. 법인세 알림 (연 1회, 3월)

12월 결산법인은 3월 31일까지 신고. 3월 1일에 D-30 알림.

```bash
openclaw cron add \
  --name "법인세 D-30 알림" \
  --cron "0 9 1 3 *" \
  --tz "Asia/Seoul" \
  --session isolated \
  --message "법인세 신고 기한이 한 달 남았습니다 (3월 31일). 결산 자료를 점검하고, 세무조정이 필요한 항목을 확인해주세요. 세무사 의뢰 여부도 안내해주세요." \
  --announce
```

### 5. 법인세 중간예납 알림 (연 1회, 8월)

```bash
openclaw cron add \
  --name "법인세 중간예납 알림" \
  --cron "0 9 1 8 *" \
  --tz "Asia/Seoul" \
  --session isolated \
  --message "법인세 중간예납 기한이 한 달 남았습니다 (8월 31일). 상반기 실적을 기반으로 중간예납세액을 계산해주세요." \
  --announce
```

### 6. 지급명세서 알림 (연 1회, 2월)

```bash
openclaw cron add \
  --name "지급명세서 알림" \
  --cron "0 9 15 2 *" \
  --tz "Asia/Seoul" \
  --session isolated \
  --message "지급명세서 제출 기한이 다가옵니다. 이자·배당·기타소득 지급명세서는 3월 2일까지, 근로·사업·퇴직소득 지급명세서는 3월 10일까지 제출해야 합니다. 이카운트 데이터를 확인해주세요." \
  --announce
```

## 크론잡 관리

```bash
# 전체 크론잡 목록 확인
openclaw cron list

# 특정 크론잡 즉시 실행 (테스트용)
openclaw cron run <job-id>

# 크론잡 수정 (예: 알림 시간 변경)
openclaw cron edit <job-id> --cron "0 8 5 * *"

# 크론잡 비활성화
openclaw cron edit <job-id> --disable

# 크론잡 삭제
openclaw cron remove <job-id>

# 실행 이력 확인
openclaw cron runs --id <job-id> --limit 10
```

## 특정 채널로 알림 보내기

기본적으로 마지막 대화한 채널로 알림이 갑니다.
특정 채널을 지정하려면 `--channel`과 `--to` 옵션을 추가합니다:

```bash
# Telegram으로 보내기
openclaw cron add \
  --name "원천세 알림" \
  --cron "0 9 5 * *" \
  --tz "Asia/Seoul" \
  --session isolated \
  --message "원천세 신고 기한이 5일 남았습니다." \
  --announce \
  --channel telegram \
  --to "-100xxxxxxxxxx"

# Slack으로 보내기
openclaw cron add \
  --name "원천세 알림" \
  --cron "0 9 5 * *" \
  --tz "Asia/Seoul" \
  --session isolated \
  --message "원천세 신고 기한이 5일 남았습니다." \
  --announce \
  --channel slack \
  --to "channel:C1234567890"

# Discord로 보내기
openclaw cron add \
  --name "원천세 알림" \
  --cron "0 9 5 * *" \
  --tz "Asia/Seoul" \
  --session isolated \
  --message "원천세 신고 기한이 5일 남았습니다." \
  --announce \
  --channel discord \
  --to "channel:1234567890"
```

## 문제 해결

### 크론잡이 실행되지 않을 때

```bash
# 1. Gateway 실행 중인지 확인
openclaw status

# 2. 크론 활성화 확인
openclaw config get cron.enabled

# 3. 타임존 확인
date  # 시스템 시간이 KST인지 확인
```

### 알림이 오지 않을 때

```bash
# 1. 채널 연결 상태 확인
openclaw channels list

# 2. 최근 실행 이력 확인
openclaw cron runs --id <job-id>

# 3. 로그 확인
openclaw logs --tail 50 | grep cron
```
