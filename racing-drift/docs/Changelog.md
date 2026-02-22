---
title: Changelog
doc_type: changelog
version: 1.0.0
status: active
owner: sangeunkim
last_updated: 2026-02-22
---

# Changelog

## [2026-02-22] Documentation Baseline
### Added
- `docs/` 폴더 생성
- PRD/설계/아키텍처/기술스펙/QA/로드맵/문서정책 문서 세트 추가
- 모든 문서에 YAML 프론트메타 적용

## [2026-02-06] Initial Game Implementation
### Added
- Three.js 기반 단일 모드 Time Attack 구현
- 1 트랙, 3랩, 고스트 토글, Start/Restart/Finish UI
- 드리프트 차지 2티어 부스트
- 오프로드 감속, 벽 충돌+스턴
- 엔진/드리프트/피니시/BGM 오디오
- 테스트 훅(`window.render_game_to_text`, `window.advanceTime`)

### Fixed/Tuned
- 복셀 좌표 축 배치 버그 수정
- 드리프트 조향/슬립 튜닝
- 시작/피니시 위치 조정
