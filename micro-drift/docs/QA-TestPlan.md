---
title: QA Test Plan
doc_type: qa-plan
version: 1.0.0
status: active
owner: sangeunkim
last_updated: 2026-02-22
---

# Micro Drift QA 테스트 플랜

## 1. 목표
핵심 게임플레이(조작/랩/충돌/부스트/고스트/UI/오디오) 회귀를 빠르게 검증한다.

## 2. 수동 테스트 체크리스트
- Start 클릭 시 레이스 시작
- 3랩 완주 시 Finish 화면 노출
- Restart 버튼으로 즉시 재시작
- Ghost 토글 On/Off 즉시 반영
- 벽 충돌 시 반동 + 약 0.3초 정지
- 오프로드 진입 시 속도 절반 수준으로 하락
- 드리프트 1초/2초 충전 해제 시 가속 체감

## 3. 자동 테스트(Playwright) 기준
기존 액션 파일 사용:
- `test-actions.json`
- `test-actions-boost.json`
- `test-actions-boost-right.json`

실행 예시:
```bash
node "$WEB_GAME_CLIENT" \
  --url http://127.0.0.1:4173 \
  --actions-file /Users/sangeunkim/Downloads/game-monorepo/micro-drift/test-actions.json \
  --click-selector "#start-btn" \
  --iterations 2 \
  --pause-ms 200 \
  --screenshot-dir /Users/sangeunkim/Downloads/game-monorepo/micro-drift/output/web-game-run
```

## 4. 합격 기준
- 콘솔 에러 파일(`errors-*.json`) 미생성
- 상태 JSON 수치가 스크린샷 상황과 논리적으로 일치
- 충돌/부스트/오프로드 핵심 메커닉 이상 없음

## 5. 회귀 시 우선순위
1. 진행 불가(시작/완주/재시작 실패)
2. 물리 규칙 위반(부스트/스턴/오프로드)
3. HUD/결과값 불일치
4. 시각/오디오 품질
