---
title: Product Requirements Document
doc_type: PRD
version: 1.0.0
status: active
owner: sangeunkim
last_updated: 2026-02-22
---

# Micro Drift PRD

## 1. 제품 개요
`Micro Drift`는 Three.js 기반 3D 복셀 카트 레이서이며, 단일 모드 `Time Attack`만 제공한다.

## 2. 목표
- 짧은 세션(1~3분)에서도 드리프트 손맛과 기록 경쟁 재미를 제공한다.
- 적은 UI와 명확한 피드백으로 즉시 플레이 가능해야 한다.
- 자동 테스트 가능한 구조(`render_game_to_text`, `advanceTime`)를 유지한다.

## 3. 대상 플랫폼
- 웹 브라우저(데스크톱 우선)
- 로컬 정적 서버 실행 기준

## 4. 게임 모드/콘텐츠 범위
- 모드: `Time Attack` 1개
- 트랙: 오벌 1개
- 카트: 플레이어 1대
- 랩 수: 항상 3랩
- 고스트: 선택 On/Off

## 5. 핵심 기능 요구사항

### 5.1 주행/물리
- 기본 속도: `80 units/s`
- 오프로드 패널티: 속도 `50%` 감소
- 벽 충돌: 튕김 + `0.3s` 스턴

### 5.2 드리프트/부스트
- 드리프트 키 홀드 차지
- Tier 1: `1.0s` 충전 시, `0.5s`, `+20%`
- Tier 2: `2.0s` 충전 시, `0.8s`, `+30%`

### 5.3 진행/기록
- HUD에 현재 랩, 랩 타임, 총 타임 표시
- 완주 시 총기록/베스트랩 표시
- 세션 최고 기록 갱신 시 고스트 데이터 저장

### 5.4 UI
- Start 화면
- HUD(주행 중)
- Finish 화면
- Restart 버튼
- Ghost 토글

### 5.5 오디오
- 엔진 루프
- 드리프트 SFX
- 피니시 SFX
- BGM 루프 1개

## 6. 조작 요구사항
- 조향: `ArrowLeft/ArrowRight`, `A/D`
- 드리프트: `Shift`, `Space`
- 전체화면: `F`

## 7. 비기능 요구사항
- 브라우저 콘솔 에러 0 유지
- 60fps 근접 동작 목표(일반 노트북 기준)
- 해상도 변경 시 렌더/카메라 비율 정상 유지

## 8. 비범위(Out of Scope)
- 멀티플레이
- 아이템/무기
- CPU 라이벌
- 트랙/캐릭터 선택 확장
- 저장/로딩 시스템

## 9. 완료 기준(DoD)
- 3랩 완주 플로우 정상
- 오프로드 감속/벽 스턴/드리프트 부스트 동작
- HUD/피니시 화면 값 일치
- `window.render_game_to_text()` 상태가 화면과 일치
- `window.advanceTime(ms)`로 시뮬레이션 가능
