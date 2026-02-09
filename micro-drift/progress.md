Original prompt: Implement "Micro Drift" as a 3D voxel kart racer using Three.js, with exactly one mode: Time Attack (1 track, 3 laps, ghost optional).

## 2026-02-06
- Initialized a standalone browser project in `micro-drift/` with `index.html`, `style.css`, and `main.js`.
- Implemented one playable kart, one oval loop track, 3-lap Time Attack flow, Start/Restart UI, lap/timer HUD, finish screen, and optional ghost toggle.
- Implemented requested mechanics:
  - Baseline speed: 80 units/s
  - Drift charge boosts: 1s (0.5s, +20%), 2s (0.8s, +30%)
  - Off-road penalty: 50% speed
  - Wall collision bounce + 0.3s stun
- Implemented generated audio: engine loop, drift SFX, finish SFX, and looping BGM.
- Exposed automation hooks for testing: `window.render_game_to_text()` and `window.advanceTime(ms)`.

## TODO / Next checks
- Run Playwright action loop and verify screenshots + `render_game_to_text` consistency.
- Tune steering/drift feel if automated run shows unstable cornering.
- Verify finish screen values match lap timing after exactly 3 laps.
- Added `Space` drift input in addition to `Shift` to match Playwright action button mapping.
- Fixed voxel placement bug: corrected `addUniqueCell` parameter order to `(x, y, z)` so track/terrain are built on the intended axes.
- Tuned handling for stability: reduced drift steer rate and lateral slip so long drifts are controllable and less likely to immediately eject into off-road.
- Adjusted drift charge rule to match prompt wording: charge depends on holding drift key (not steer+drift combo).
- Repositioned start/finish line to a top straight section (`START_S = 20`) for cleaner race starts.
- Validated local launch via `npm run start` and HTTP 200 on `/index.html`.
- Verified via Playwright loop that HUD updates, off-road speed drop (80 -> 40), wall stun state (`stunTimeLeft`), and drift boost speed spike (e.g. speed 96 after long hold/release) are reflected in state output.
