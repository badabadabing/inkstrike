Original prompt: 请先了解项目，再参考 CS / Valve 的公开设计方法和相关技能，对 INK STRIKE 的画面、地图、人物、枪械、操作和场景进行全面升级。

2026-09-27 — Revision 02
- Read AGENTS.md / HANDOFF.md; initial worktree clean. Baseline smoke passes, known PIT navigation failure reproduced.
- Keep offline runtime, nine global JS files, original ink/paper palette and all three modes. Deployment was not requested at the start; the user authorized both Cloudflare targets later.
- Shared boundaries: map.js = world; actors.js + weapons.js = combat art; touch.js = touch; game.js + index.html + integration = root.
- Acceptance: syntax, existing smoke, desktop/mobile interaction checks, fixed screenshots and browser console. Real-phone feel remains user review.
- References: Valve Illustrative Rendering paper (https://cdn.fastly.steamstatic.com/apps/valve/2007/NPAR07_IllustrativeRenderingInTeamFortress2.pdf), Enemy Spotted (https://blog.counter-strike.net/pt-br/2020/06/30482/). Public research only, no Valve participation.
- Plan: distinct landmarks and route hierarchy; beveled original soldier / gun geometry; editorial menu / restrained HUD; live tactical map, mouse procurement, quality and motion controls; stable multitouch.

- User steering: 5v5 is too small; adapt team size to performance and improve Bot decisions. Implemented auto/5/8/12 per team (24 total), safe roster changes between comp rounds / next DM match, unique bot names and nav-safe spawn separation. Real-frame sampling excludes manual tests and retains slow frames.
- Implemented all three landmarks, reduced random detail, PIT/NEST fixes; DDA rays match 16,719 fixed reference rays and query microbenchmark improves ~5x (not whole-game FPS).
- Bot roles and cover reservation, elected defuser and guards, finite intel memory, friendly fire-line avoidance, range-aware bursts. Independent review caught interrupted defuser ownership; fixed and regression covered.
- UI/mouse buy/tactical map/settings implemented. Independent review caught jump input through map; fixed. Touch 17 dedicated synthetic cases and integrated regressions pass.
- Final integrated upgrade-check: 56 assertions pass, zero console/page errors. Native Pointer Lock unavailable in test Chromium; fallback flow passes.
- develop-web-game client ran movement/shooting and produced reviewed screenshot+text state. Original SwiftShader run stalled; ran the same client via a temporary installed-Playwright resolver with Metal launch flag. No runtime dependency added.
- Art review: first pass rifle forearm/stock occluded too much screen; shortened/bent sleeve and repositioned viewmodel, final still keeps deliberately faceted paper style.
- Deployment was initially deferred; see the release record below. Native phone feel, multiplayer, additional complete map and skeletal IK remain outside this local revision.

- Final validation: all js/ and tools/ syntax checks + git diff --check pass. Final smoke: 5 competitive rounds resolved, DM21 total kills, five range dummies, no unreachable navigation goals, SMOKE OK.
- Extended 12v12 performance: three independent 1440x900, requested DPR2 / balanced actual DPR1.5 runs on Apple M5 Max via Chromium Metal. Each 120 warmup +900 measured RAF frames, moving/shooting invulnerable player with active DM bots. p50 16.6–16.7ms, p95 17.4–17.5ms, p99 17.5–17.7ms, worst23.8ms; CPU p95 1.8–2.2ms; no runtime errors or shader program growth. These are local measurements, not phone or universal FPS guarantees.
- Final desktop menu/range/sites/tactical and 844x390 touch menu/game screenshots reviewed. Short-screen menu uses top alignment so overflow remains scrollable.

2026-09-27 — Authorized Cloudflare release
- User explicitly requested updating both the game Pages site and banmabox.com. Verified Wrangler OAuth and existing project/domain bindings.
- Published clean f906695 runtime archive to Pages production 3995b107-bb5f-4025-983a-6cf183f7e1b0.
- Updated only the InkStrike copy and listing in BANMABOX; Worker version d75ea8cd-4f79-48c6-bdbc-e7e823059b78, listing commit2443e1c. Nine assets changed, 423 local asset hashes preserved. No database migrations or GitHub push.
- Repeated smoke passes. Both public URLs load comp/dm/range, 12v12 has23 bots, range has5 dummies. All9 game scripts match source on both hosts. Desktop/mobile listing and card click verified; stats API and www path pass. Evidence: outputs/revision-02/release/.
