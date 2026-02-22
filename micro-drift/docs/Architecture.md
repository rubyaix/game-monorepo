---
title: Architecture
doc_type: architecture
version: 1.0.0
status: active
owner: sangeunkim
last_updated: 2026-02-22
---

# Micro Drift 아키텍처

## 1. 파일 구조
- `index.html`: Canvas + Start/HUD/Finish UI
- `style.css`: HUD/오버레이/버튼 스타일
- `main.js`: 렌더링, 물리, 입력, 오디오, 상태관리

## 2. 런타임 구성요소
- Rendering: Three.js `Scene`, `Camera`, `Renderer`
- Track Math: `sampleCenterline`, `nearestCenterlineInfo`
- Physics: `updateKart`
- Audio: `AudioManager`
- UI Sync: `updateHUD`, `setModeUI`
- Ghost Replay: `updateGhost`

## 3. 상태 모델
`state` 핵심 필드:
- 모드: `start | running | finished`
- 타이머: `currentLapTime`, `totalTime`, `lapStartTime`
- 주행: `position`, `heading`, `speed`, `offroad`
- 드리프트: `driftActive`, `driftCharge`
- 부스트: `boostTimeLeft`, `boostMultiplier`
- 충돌: `stunTimeLeft`
- 고스트: `runFrames`, `bestGhostFrames`, `ghostEnabled`

## 4. 업데이트 순서
1. 입력 기반 조향/드리프트 상태 갱신
2. 스턴/부스트/오프로드 적용 후 속도 계산
3. 위치/헤딩 이동
4. 벽 충돌 처리
5. 진행도/랩 판정
6. 오디오 파라미터 반영
7. HUD/카메라/렌더

## 5. 테스트 인터페이스
- `window.advanceTime(ms)`: 고정 스텝 시뮬레이션
- `window.render_game_to_text()`: 현재 상태 JSON 직렬화

## 6. 확장 지점
- 트랙 추가: 중심선/시각 생성 로직 분리 필요
- 리플레이 고도화: 프레임 보간/파일 저장
- 오디오: WebAudio 시퀀서 분리
