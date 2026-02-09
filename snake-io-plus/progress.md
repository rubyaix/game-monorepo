Original prompt: https://apps.apple.com/kr/app/snake-io/id6443553808
Snake.io+ 구현해줘.

## 2026-02-06
- 초기 세팅: `snake-io-plus` 폴더 생성.
- TODO: Snake.io+ 스타일의 웹 게임 기본 구현 (메뉴, 이동, 성장, 충돌, AI 봇, 점수판).
- TODO: `window.render_game_to_text`, `window.advanceTime` 노출.
- TODO: Playwright 클라이언트로 반복 테스트 및 스크린샷/콘솔 점검.
- 구현 1차 완료: `index.html`, `styles.css`, `game.js` 작성.
  - 메뉴/시작/게임오버 UI
  - 플레이어 이동(키보드+마우스+터치), 부스트, 일시정지, 전체화면
  - 먹이 수집/성장, 부스트 시 꼬리 질량 드롭
  - AI 봇 추적/회피, 헤드/몸통 충돌 판정, 봇 리스폰
  - HUD/리더보드 렌더링
  - `window.render_game_to_text`, `window.advanceTime` 노출
- 다음 단계: Playwright 자동 플레이로 오류 확인 및 밸런스/버그 수정.
- 자동 테스트(run-1): 시작 버튼 클릭 후 이동/부스트 입력 4회 반복, 콘솔 오류 없음.
- 자동 테스트(run-long): 장시간 입력 시나리오로 성장/감소/AI 충돌 상태 확인, 콘솔 오류 없음.
- UI 스모크(run-ui-smoke): 메뉴 표시, 시작 후 `mode=playing`, `P` 일시정지/해제, 재시작 후 `mode=playing` 확인.
- 회귀 테스트(run-regression): 6회 반복 캡처 기준 상태 JSON/스크린샷 정상, 오류 파일 미생성.
- 참고: Playwright 기본 캡처는 캔버스만 저장하므로 메뉴/오버레이 확인은 별도 full-page 스모크로 검증함.

## 다음 에이전트 제안
- 사운드 효과(BGM/먹이/충돌) 추가.
- 난이도 프리셋(봇 수/속도/월드 크기) 옵션 추가.
- AI 충돌 회피 고도화(서로 교차 패턴 완화).
