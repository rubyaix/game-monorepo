Original prompt: Implement "Hex Hold" as a 2D grid-based tower defense using Phaser.js,
with exactly one mode: Campaign Level 1 (fixed map, 10 waves).

TODO
- Scaffold Phaser app with single scene and 7x7 hex grid.
- Implement fixed map path + A* hex pathfinding with random tie-breaks.
- Implement towers/enemies/waves/currency/lives/win-lose.
- Implement placement preview + UI counters + mode switch controls.
- Implement SFX/BGM loop.
- Run Playwright validation loop and fix issues.

Progress Update
- Implemented Phaser app shell and full gameplay loop in game.js.
- Added fixed 7x7 hex map, A* pathfinding on hex graph with random tie handling.
- Added 3 towers, 3 enemies, economy, 10 waves, 15s wave interval, victory/defeat.
- Added placement preview valid/invalid indicator and core HUD counters.
- Added synthesized placement/hit/death SFX and looping BGM pattern.
- Exposed window.render_game_to_text and window.advanceTime hooks.

Validation Update
- Installed Playwright where required and ran web_game_playwright_client loops.
- Fixed headless capture visibility by switching renderer to Phaser.CANVAS.
- Verified active gameplay state transitions and no runtime console/page errors.
- Verified defeat condition with no towers: mode=defeat, lives reached 0.
- Verified victory condition with placements: mode=victory, wave=10, enemies=0.

Remaining Notes
- Uses synthesized WebAudio tones for placement/hit/death/BGM instead of external files.
- No upgrades/sell/pause are intentionally omitted per scope.
