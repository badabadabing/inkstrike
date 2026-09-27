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

Revision 03 — simulated player/expert panel and independent Dream Loop
- User requested 20 recommendations followed by implementation and independent visual acceptance. REVIEW-R03.md records evidence-based scope and acceptance behavior; reviewers are simulated, not actual professional player or Valve endorsements.
- Ownership: player_panel actors.js/objective.js (AI and character contact/stance); systems_panel map.js/weapons.js/core.js (world/weapon art and detail tiers); root game.js/index.html/progress.js/touch integration; dream_review tools/visual-review.js and independent screenshots/reports only.
- Retain prior authorized dual Cloudflare synchronization after verified completion. Working branch codex/revision-03-review-upgrade, baseline936dd5c.

- Revision 03 验收完成：原有56项、新交互37项、AI/资源41项，共134项；三模式SMOKE OK；16773射线等价性通过。独立画面V01–V07关闭，19固定镜头+触屏补验。
- 12v12 动态三轮各900帧，M5 Max/Metal均衡DPR1.5下P95帧间隔17.5/16.9/17.5ms，0错误。最终低画质静态提交减少33.3%三角形。准备按已授权同步Cloudflare两入口。
- 工作过程中出现不属于本轮的 tools/build-xhs.js、tools/xhs-* 和其他outputs内容；保持原样，发布仅从本轮提交导出 index.html/js/vendor。


## Revision 04 — 九项真实实玩反馈（2026-09-28）

- 雷达和战术图隐藏全部敌人；死后可用按钮/键盘/触屏切换队友观战。
- Bot 加入有限信息反狙击避险、目击倒地分路；终审修复紧急拆核残留掩体与低掩体露头误判。
- 三地图（纸镇、折页货场、双井沙城）、三套整套装备预设、低倍 M4/飞白瞄具与狙击稳定代价。
- 独立触控尺寸/圆环位置与大小；Mac触控板输入分支、H光标复位、Z开火/V瞄准；6+连杀正确播报。
- 检查：26反馈 +46战术 +20触控；既有56升级/37修订/41AI；三图×三模式、683导航路径、30,000射线一致；最终smoke已输出SMOKE OK。证据在 outputs/revision-04/。
- Dream Loop独立交叉审查：功能可读性通过，环境细节丰富度部分通过；物理触控板和手机硬件未验收。
- 本机纸镇12v12、3×900帧：p95帧间隔17.5/17.2/17.5ms，JS提交p95 1.5/1.7/1.8ms，采样shader增长0，页面错误0。
- 在独立 codex/revision-03-review-upgrade worktree 提交发布，不切换/提交并行小红书任务的主目录分支与文件。Cloudflare两个目标在验证后发布并另记实际ID。
