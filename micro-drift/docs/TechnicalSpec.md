---
title: Technical Specification
doc_type: technical-spec
version: 1.0.0
status: active
owner: sangeunkim
last_updated: 2026-02-22
---

# Micro Drift 기술 스펙

## 1. 런타임/의존성
- Node.js: 로컬 정적 서버 실행용
- 패키지: `three@^0.182.0`
- 렌더링: WebGL (Three.js)
- 오디오: Web Audio API

## 2. 실행 방법
```bash
cd /Users/sangeunkim/Downloads/game-monorepo/micro-drift
npm install
npm run start
# http://127.0.0.1:4173
```

## 3. 고정값
- `FIXED_DT = 1/60`
- `BASE_SPEED = 80`
- `OFFROAD_FACTOR = 0.5`
- `STUN_DURATION = 0.3`
- `LAP_COUNT = 3`

## 4. 입력 매핑
- 좌회전: `ArrowLeft`, `KeyA`
- 우회전: `ArrowRight`, `KeyD`
- 드리프트: `ShiftLeft`, `ShiftRight`, `Space`
- 전체화면: `KeyF`

## 5. 공개 테스트 훅
- `window.render_game_to_text(): string`
- `window.advanceTime(ms): void`

## 6. 알려진 기술 부채
- 단일 파일(`main.js`) 집중 구조로 모듈성 낮음
- 트랙/물리 파라미터 하드코딩
- 고스트 저장이 메모리 세션 단위(영구 저장 없음)
