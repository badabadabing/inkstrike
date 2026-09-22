# AGENTS.md — INK STRIKE 墨线突击

> 本文件是 Agent 在本项目的行为契约。改动前先读。

## 项目速览
- 作用:线稿/排线风格的浏览器 FPS(5v5 对 Bot,竞技回合制 + 死斗)。
- 技术栈:原生 JS + three.js r160,无构建步骤。**零外部依赖**:three.js 与线条 addons 在 `vendor/`,字体(拉丁子集 woff2)在 `vendor/fonts/`,importmap 指向本地。
- 启动:`python3 -m http.server 8765`(在本目录),打开 http://localhost:8765
- 调试:URL 加 `?auto` 跳过指针锁定;控制台可直接调用 `startMatch()`、`frame(1/60)` 步进模拟。
- 语法检查:`for f in js/*.js; do node --check $f; done`

## 结构
- `js/core.js` 调色板 / 排线着色器 fillMat / 线材质 lineMat / Sk 草图构建器 / 合成音效 SFX
- `js/map.js` 地图 PAPER TOWN(solid() 同时注册碰撞与可视)/ 碰撞 moveEntity / rayWorld / 导航网格 A*
- `js/weapons.js` 武器数值 WEAPONS / 枪模 GUNS(侧面轮廓 prof 挤出)/ 第一人称 VM
- `js/actors.js` 士兵模型 / 命中盒 rayEnt / Bot AI
- `js/fx.js` 墨点贴花、粒子、曳光、爆炸
- `js/objective.js` 墨核(炸弹)安放/拆除、Bot 目标脑(进攻/防守/保枪/预瞄)、烟墨弹/曝光弹、梯子、地面材质
- `js/progress.js` 连杀播报、MVP、伤害统计、武器熟练度与笔触皮肤(localStorage `inkstrike_prog`)
- `js/touch.js` 手机触控:左摇杆/右半屏瞄准/按钮/辅助瞄准减速/自动开火(URL 加 `?touch` 可在桌面强制开启)
- `js/game.js` 玩家、战斗、回合经济、HUD、主循环

## 硬规则
- 画风:主体只用 PAPER/INK;颜色仅限 RED(血/红方)、AMBER(火光/点位)、BLUE(蓝方)、GLASS、WOOD。
- 地图结构坐标保持整数(导航网格 1m,门洞 ≥2 格);新增掩体后用 `MAP.reach` 验证所有 `MAP.points` 可达。
- 所有命名与文案均为原创,不得引用其他游戏的名称/文案。
- 改完必须:node --check 全过 + 浏览器无控制台报错 + 快进一局(见下)回合能正常结算。

## 玩法约定
- 竞技模式 = 红方(进攻)带墨核到 A/B 安放(3.2s),40s 引爆;蓝方拆除 6s。回合结束原因通过 `endRound(win, reason)` 传给横幅。
- 弹道固定:`WEAPONS[k].pat` 为每发的 [pitch, yaw] 踢量,由 `mkPat` 生成;改动后到靶场(`G.mode='range'`)对墙验证。
- 敌我识别靠颜色:敌方红墨线 + 红背心,友方蓝墨线 + 名字标签,均按 `team` 生成,不随玩家阵营变化(玩家所在队伍就是蓝或红)。
- Bot 难度表 `DIFFS`:react / err / see(视距)三项是手感的主要旋钮;抬难度先调 err 再调 react。

## 沉淀的教训
- 2026-09-22 屏幕投影标签必须先用 `camera.matrixWorldInverse` 判定在相机前方,`project()` 后只看 z 会让身后目标出现幻影。
- 2026-09-22 引爆伤害要在 `endRound` 之后结算,否则全灭判定会抢先把胜负给另一方。
- 2026-09-22 国外 CDN(jsdelivr / Google Fonts)在大陆可能加载失败 → 所有第三方资源一律放 `vendor/` 本地引用,禁止再引入外链。
- 2026-09-22 CSS 类名冲突:横幅状态类曾叫 `.go`,与按钮 `.go` 撞名导致整条红块 → 横幅状态类统一加 `b-` 前缀。
- 2026-09-22 内嵌预览面板不支持 Pointer Lock → lock() 失败时自动降级为非锁定模式并提示。
- 2026-09-22 水平面上的世界空间排线在掠射角会产生摩尔纹 → hl() 里用 fwidth 提前淡出为平均灰度。
