---
title: Documentation Policy
doc_type: policy
version: 1.0.0
status: active
owner: sangeunkim
last_updated: 2026-02-22
---

# 문서 운영 정책

## 1. 기본 원칙
코드 변경이 있으면 같은 작업 단위에서 문서도 함께 갱신한다.

## 2. 반드시 업데이트할 문서
- 요구사항/범위 변경: `PRD.md`
- 시스템/구조 변경: `Architecture.md`, `TechnicalSpec.md`
- 밸런스/룰 변경: `GameDesign.md`
- 테스트 절차 변경: `QA-TestPlan.md`
- 릴리즈 단위 변경사항: `Changelog.md`

## 3. 작업 종료 체크리스트
1. 변경된 기능이 어떤 문서에 반영되어야 하는지 식별
2. 대상 문서의 `last_updated` 갱신
3. 변경 요약을 `Changelog.md`에 기록
4. 문서와 실제 코드 수치/용어 일치 확인

## 4. 문서 작성 규칙
- 모든 Markdown 문서는 YAML 프론트메타를 포함한다.
- 코드 상수명과 문서 수치를 동일하게 유지한다.
- 추정/미확정 항목은 TODO로 명시한다.
