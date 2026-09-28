# INK STRIKE 墨线突击 · 交接文档

> 给接手的 Agent(GPT / Codex / 其他)和开发者。先读 `AGENTS.md`(硬规则),再读本文(架构、改法、待办)。
> **当前工作版本：Revision 04（2026-09-28）**。九项实玩反馈的实现与本地验证见 §12；R02/R03 保留为历史。R04 的部署 ID 与线上验收尚待发布负责人补录，本文不表示已经上线。

## 1. 这是什么

线稿 / 排线画风的**浏览器第一人称射击游戏**,支持 5v5 / 8v8 / 12v12 对战 Bot 与性能自适应人数。

| 模式 | 规则 |
|---|---|
| 竞技 `comp` | 红方进攻:把「墨核」带到 A/B 点安放(3.2s),40s 后引爆;蓝方防守:拆除(6s)。回合经济买枪,先取 7 胜 |
| 死斗 `dm` | 无限重生,先取 40 击倒或 8 分钟 |
| 靶场 `range` | 每图 5 个训练假人，位置和距离随图变化；静止/横移靶、30 秒训练与实际命中统计，免费取枪。纸镇另保留弹道墙 |

- 画风:纸白底 + 墨线描边 + 排线阴影;颜色只用在血(红)、红/蓝阵营、火光/点位(琥珀)、玻璃、木纹。
- 平台:桌面键鼠(Pointer Lock / 非锁定降级，鼠标与触控板输入档)+ 手机触控(浮动或固定摇杆、每按钮独立布局/尺寸、辅助减速、自动开火)。
- 地图:纸镇 `papertown`、折页货场 `warehouse`、双井沙城 `dunes`。后两张参考仓库与长短道竞技结构，使用本项目原创纸墨几何、命名和墨核双点规则，不是 Valve 原版地图文件或一比一复刻。
- 外观:「折锋 / 巡纸 / 守砚」三套固定装备预设，带真实模型预览；头部、护目、围巾等随整套切换，不能逐部件自由组合。
- **当前同步目标**:https://inkstrike.pages.dev (Cloudflare Pages) · https://banmabox.com/inkstrike/ (Cloudflare Worker 静态副本)。GitHub Pages（https://badabadabing.github.io/inkstrike/ ，推送 main 触发）自 R06 起与主站同步。
- **仓库**:https://github.com/badabadabing/inkstrike(public,main 分支)

## 2. 技术栈与运行

- 原生 JavaScript(非 ES module 的普通 `<script>`,**全局作用域共享**)+ three.js r160。无构建、无 npm 依赖。
- 第三方全部在 `vendor/`(three.js、LineSegments2 线条 addon、字体)。**禁止加外链**(大陆访问问题)。
- 本地运行:
  ```bash
  python3 -m http.server 8765        # 在仓库根目录
  # 浏览器打开 http://localhost:8765
  # 调试: ?auto 跳过指针锁定；?auto&touch 强制触控界面
  # 选图: ?auto&map=warehouse 或 ?auto&map=dunes；可附加 &mode=range
  ```
- 冒烟测试(无头浏览器,自带静态服务器,**每次改完必跑**):
  ```bash
  node tools/smoke.js      # 输出 SMOKE OK 才算过;需要 playwright(脚本里有查找逻辑,找不到会提示安装)
  ```
- 发布目标（先完成测试并 commit，两个入口同步同一提交）：

  | 目标 | Cloudflare 项目 / 配置 | 线上入口 |
  |---|---|---|
  | 游戏主站 | Pages 项目 `inkstrike` | https://inkstrike.pages.dev/ |
  | 斑码盒子游戏副本 | Worker 项目 `banmabox`；`/Users/bing/Developer/banmabox/wrangler.jsonc` | https://banmabox.com/inkstrike/ （`www.banmabox.com` 同 Worker 绑定） |

  **本轮用户已明确授权完成升级后发布 Cloudflare 主站，并同步斑码盒子。** 后续执行仍须依据对应任务的授权；这里记录发布流程，不扩大为永久、任意项目的发布授权。

  原 `tools/deploy.sh` 会先执行 `git push`，触发 GitHub Pages，再发布 Cloudflare Pages。仅发布 Cloudflare 时可在游戏仓库将已提交资源导出到干净目录：
  ```bash
  release_dir=$(mktemp -d)
  git archive HEAD index.html js vendor | tar -x -C "$release_dir"
  wrangler pages deploy "$release_dir" --project-name inkstrike --branch main
  ```

  合集使用独立副本：把同一干净包中的 `index.html`、`js/`、`vendor/` 增量同步到 `/Users/bing/Developer/banmabox/public/inkstrike/`。`scripts/sync-games.sh` 会删除并重建整个 `public/`，单游戏更新不要运行它；保留其他已上线游戏与已本地化资产。同步前后比较 `public/inkstrike/**`、`public/main.js` 之外所有文件的路径清单与 SHA-256，确认其他资产未变化。

  在 `/Users/bing/Developer/banmabox` 更新 `site/main.js` 内墨线突击的介绍后，同步首页文案与游戏副本统计，再部署 Worker：
  ```bash
  python3 scripts/inject_play.py public inkstrike
  cp site/main.js public/main.js
  wrangler deploy
  ```
  `inject_play.py` 只修改合集副本；每次先复制新的游戏 `index.html`，再注入一次，避免重复统计脚本。游戏主仓库不加入合集统计脚本。

  发布完成必须验证两个线上入口：静态资源请求成功，实际浏览器能进入并运行对局、控制台无新错误；主站与合集的 `js/game.js` 内容哈希一致，且与本次提交一致（建议同时比较全部 `js/`）。合集 `index.html` 因统计注入允许不同。记录实际部署 ID 和验收结果，命令提交成功不能代替线上验收。发布前用 `wrangler whoami` 核验当前登录；若需执行原脚本，再核验 `gh auth status`，其他机器的登录状态不能沿用本机记录。

## 3. 文件地图(加载顺序即依赖顺序,见 `index.html` 末尾的 `files` 数组)

| 文件 | 行数 | 职责 | 关键符号 |
|---|---|---|---|
| `js/core.js` | ~275 | 调色板常量、数学工具、**排线着色器** `fillMat`、线材质 `lineMat`、**草图构建器 `Sk`**、程序化贴图、**合成音效 `SFX`** | `PAPER INK RED AMBER BLUE`, `Sk`, `SFX.shot/step/...`, `SFX.SHOT`(每把枪声学参数) |
| `js/map.js` | ~489 | 三张地图的数据、生成与资源重建；建筑/掩体/远景、碰撞、射线、导航网格 + A* | `MAP_CATALOG`, `MAP`, `configureMap`, `buildMap`, `buildPaperTown`, `buildArena`, `solid()`, `moveEntity`, `rayWorld`, `segClear`, `navPath` |
| `js/weapons.js` | ~186 | 武器数值、固定弹道、线稿枪模、实体低倍瞄具、第一人称动画/手套/皮肤 | `WEAPONS`, `BUY_LIST`, `GUNS`, `worldGun`, `finishGun`, `viewGlove`, `VM` |
| `js/actors.js` | ~220 | 士兵装备预设、共享模型/命中盒、Bot 感知与避险 AI | `ACTOR_STYLES`, `setActorStyle`, `DIFFS`, `makeBot`, `botThink`, `botGoal`, `botOnShot/Damage/Death`, `botFindCover`, `botTacticalMotion`, `rayEnt` |
| `js/fx.js` | ~54 | 墨点弹孔/血迹贴花(InstancedMesh)、粒子、曳光、枪口火、爆炸环 | `FX` |
| `js/objective.js` | ~106 | 墨核安放/拆除、Bot 目标脑(攻/守/保枪/预瞄)、烟墨弹、曝光弹、梯子、地面材质 | `BOMB`, `SITES`, `bombUpdate`, `botObjective`, `botHoldYaw`, `smokeSpawn`, `smokeBlocks`, `flashBang`, `ladderAt`, `surfaceAt` |
| `js/progress.js` | ~52 | 连杀播报与取消生命周期、MVP、伤害统计、熟练度/皮肤、计时训练 | `PROG`, `STREAK`, `streakTitle`, `SKINS`, `TRAIN` |
| `js/touch.js` | ~94 | 手机触控、辅助减速、自动开火、按钮独立缩放/拖动、摇杆圆环与固定中心 | `TOUCH`, `initTouch`, `updateTouch`, `layoutApply`, `layoutEdit`, `layoutSelect`, `layoutJoyScale`, `layoutJoyCenter` |
| `js/game.js` | ~326 | 状态/输入/战斗/经济/HUD/相机/主循环，选图刷新、观战和外观入口 | `G`, `LOOK`, `mouseLook`, `resetLook`, `frame`, `playerFire`, `fireBullet`, `startMatch`, `spawnEnt`, `endRound`, `cycleSpectator`, `updateActorPreview` |
| `index.html` | ~339 | 全部 CSS、HUD/菜单/采购/暂停/武库 DOM、importmap、脚本加载器 | |

## 4. 核心机制速查

**主循环** `frame(dt)`(game.js 末尾):`updateFlow` → `updateTouch` → `updatePlayer` → `TRAIN.update` → 各 Bot `updateBot` → `updateNades` → `bombUpdate` → `smokeUpdate` → `FX.update` → `updateCamera` → `VM.update` → `updateHUD` → 渲染世界 + 叠加渲染视图模型。`G.timescale` 做慢动作。

**状态机** `G.state`:`menu → freeze(准备,可采购)→ live → roundEnd → …… → matchEnd`。死斗/靶场直接 `live`。

**渲染画风**:所有几何经 `Sk` 累积后 `bake()` 成 **1 个填充网格 + 1 个线段网格**(每个大物件 2 次 draw call)。
- 填充着色:顶点属性 `tone`(0 白、0.33 单向排线、0.66 交叉排线、1 实心墨)+ `tint`(底色)。`Sk('sun')` 按太阳方向自动给侧面/底面排线。
- 描边:`EdgesGeometry` 提取折边 → `LineSegments2`(屏幕像素宽,需 `resolution`,已在 `onResize` 统一更新 `LINE_MATS`)。
- 新增物件:在 `buildPaperTown` / `buildArena` 对应生成器里用 `solid(x1,z1,x2,z2,y0,y1,opts)`(会同时进碰撞和导航)或纯装饰 `sk.box/cyl/prof/line`。

**射击**:`playerFire` → `fireBullet`(射线打实体 `rayEnt` / 打世界 `rayWorld`,薄物体可穿透一次)→ `hurt`(护甲、部位倍率 头×4 腹×1.25 腿×0.75、距离衰减 `fall`)→ `kill`。后坐 = `WEAPONS[k].pat[n]` 固定踢量(+极小噪声),散布 = `curSpread`(移动、空中、连射、蹲)。

**Bot AI**(actors.js + objective.js):
- `botThink` 每 ~0.1s:视野锥 + `botSee`(射线,被烟挡)选目标 → 反应时间 `DIFFS.react` 后开火,误差 = `aimErr + 距离项 + 连射项 + 双方移速` × `DIFFS.err`。
- 无目标时 `botGoal`:竞技模式先问 `botObjective`(攻方去计划点/守包,守方守点/回防拆包/残局保枪/按队友报点转点),到点后 `botHoldYaw` 预瞄敌人来路。
- 被卡住会跳/换路;听到枪声脚步 `botHear` 会转头或追。
- R04 通过 `botOnShot / botOnDamage / botOnDeath` 记录狙击近失弹、受击或目击倒地。未看见枪手只记录有误差的方向或倒地点；`botFindCover` 通过 `botCoverOccluded` 同时检查头顶和胸部的站姿/蹲姿遮挡与可走路径，`botTacticalMotion` 沿正常碰撞移动，`botDangerDetour` 避开短时危险区域。`botUrgentDefuse` 在紧急拆核时清除旧掩体/路径状态并恢复目标寻路；任务互动优先，不靠提高 `DIFFS` 命中率实现“变聪明”。

**手感旋钮一览**
| 想调什么 | 改哪里 |
|---|---|
| Bot 太准/太菜 | `actors.js` `DIFFS`:`err`(散布倍率)> `react`(反应秒)> `see`(视距 m)> `head`(瞄头概率) |
| 武器伤害/射速/弹匣/价格 | `weapons.js` `WEAPONS` |
| 弹道形状 | `weapons.js` `mkPat(up, side, n, dir, phase)`;改后去靶场对墙验证 |
| 移动速度/跳跃/落地惩罚 | `game.js` `updatePlayer`(5.1 基础速度、5.95 跳速、`landSlow`) |
| 回合时间/胜场/经济 | `game.js` 顶部常量 + `endRound` 里的奖励 |
| 墨核时间 | `objective.js` `PLANT_T / DEFUSE_T / BOMB_T` |
| 枪声 | `core.js` `SFX.SHOT[kind]`(crack/body/thump/mech/tail/drive/rev/gain) |
| 画面雾/排线密度 | `core.js` `FOG_D`、`fillMat({freq, hatch, hw})` |

**本地存储**:`localStorage.inkstrike` 保存设置，包括 `map`、`aimMode`、`actorStyle`、`btnScale`、`btnSizes`、`layout`、`joyScale`、`joyPos`；旧有灵敏度/FOV/音量/准星/触控设置继续保留。`inkstrike_prog` 保存熟练度、皮肤、MVP，整套人物装备选择不消耗或覆盖熟练度。

## 5. 常见扩展怎么做

- **加一把枪**:`WEAPONS` 加条目(`slot` 1 主/2 副/4 投掷,`snd` 指向 `SFX.SHOT` 的键)→ `GUNS[key](p)` 用 `p.body/p.mag/p.bolt` 画模型并返回 `{muzzle, lh, grip}` → 需要固定弹道就 `WEAPONS.key.pat = mkPat(...)` → 加进 `BUY_LIST`(采购卡片最多 10 个,数字键 1–9/0)。图标会在启动时 `makeIcons` 自动渲染。
- **加一张地图**:在 `MAP_CATALOG` 添加展示信息；在 `configureMap(id)` 添加完整地图数据，并在 `buildMap(scene,id)` 分派到新生成器（现有为 `buildPaperTown` / `buildArena`）。补菜单 `#sMap` 选项及 `tools/map-check.js` 的地图枚举。每图须提供出生/双点/训练/区域/镜头/中路防守数据，不能沿用纸镇硬编码；数据契约见 §12。结构坐标为整数，门洞至少 2m，所有 `points` 和训练靶必须通过可达与视线测试。当前各图保留相同 128×112 网格和雷达包络。
- **加一种投掷物**:`WEAPONS` 加 `nade: true, fuse` → `GUNS` 画模型 → `updateNades` 里按 `n.kind` 分支 → `NADES` 数组(game.js)加键 → `BUY_LIST`。
- **加一套装备预设**:扩充 `ACTOR_STYLES` 和士兵模型的装备分支，第一人称差异在 `viewGlove`；预览使用同一真实生成器。模型/VM 缓存键必须包含风格，切换保持血量、弹量、换弹进度和命中盒。当前是整套预设，不存在独立部件组合数据层。
- **加一个模式**:`G.mode` 新值;在 `startMatch`(建队伍)、`spawnEnt`(出生点)、`startRound`(横幅/发枪)、`updateFlow`(胜负)、`canBuy` 里各加分支;菜单按钮在 `index.html` 的 `#optMode`。

## 6. 代码风格(务必保持一致)

- 代码是**高密度单行风格**(一行多语句,短变量名),注释很少。新代码照此风格写,不要大面积重排格式(会让 diff 不可读)。
- 全局函数/对象互相直接调用;新文件要加进 `index.html` 的 `files` 数组并注意顺序(被依赖的在前)。
- 编辑建议用**精确字符串替换**,替换前确认锚点唯一存在。
- 改完:`for f in js/*.js; do node --check $f; done` → `node tools/smoke.js` → 浏览器实际看一眼；相关 R04 回归见 §12。需要提交时 commit(结尾加协作者署名行)；发布仅在当前任务明确授权后按 §2 执行，未授权时不直接 push/部署。

## 7. 已知问题与技术债

- 竞技模式可能由玩家携带墨核；Revision 03 支持 G 或地图按钮交给 5m 内可见活队友，玩家仍需主动安放或交接。
- Revision 02 已修复 PIT 和蓝方到 NEST 的导航问题；全部目标均须通过冒烟检查，不再豁免。
- `G.huntAll` 已不再被置为 true，`actors.js` 里相关等待倍率可后续清理。
- 当前脚本缓存标识为 `revision-04`；后续发布改 JS 必须同步更新 `index.html` 的版本标识。
- `rayWorld` 使用现有 buckets 的 XZ DDA；轴向射线保留线性语义。修改地图网格边界后须运行 `tools/raycheck.js`。
- 每个音效实时创建 Web Audio 节点;极端混战下低端手机可能卡顿,可加并发上限。
- 内嵌预览面板(IDE 内浏览器)不支持 Pointer Lock,会自动降级;真实浏览器正常。
- 真机体验(物理 Mac 触控板、手机握持/热量/长期帧率、枪声听感)尚未由本轮浏览器自动化验证。
- 新地图空间可读性已通过独立地面截图审核，但大墙/地面留白、同形货垛和室内外光照差异仍有限。未做阵营胜率的充分统计平衡；货场屋顶没有提供可攀爬路线。
- R04 雷达和战术图完全隐藏敌人；R03 的“最后目击敌人点”仅是历史行为，不能因仍有 `spottedBy` 感知字段而恢复显示。

## 8. 路线图(建议优先级)

1. **联机对战**:最大的一项。推荐 Cloudflare **Durable Objects** 做房间(一个 DO = 一局),WebSocket 同步输入,服务器权威判定命中(复用 `rayEnt/rayWorld`,需把这两个和 `MAP` 抽成可在 Worker 里跑的纯函数模块)。先做 2v2 房间码 + 客户端预测/插值,再扩到 5v5。
2. **设备实测**:物理 Mac 触控板与手机长时间测试；现有独立按钮/圆环缩放和性能档位之上，再考虑陀螺仪辅助瞄准(`DeviceOrientationEvent`,iOS 需权限)与布局预设。
3. **地图打磨**:三图已可选；补新图的环境层次与不同掩体轮廓，并做足量攻防胜率、转点时间和出生安全测试。
4. **Bot**:道具定点(每点位预设烟闪落点)、残局 1vN 的时间管理、狙击位。
5. **内容**:更多笔触皮肤、击杀特效、赛后总结页、段位(本地)。
6. **工程**:把 `tools/smoke.js` 接到 GitHub Actions,push 时自动跑。

## 9. 仓库外的相关资产

- `~/Desktop/inkstrike-promo/`:小红书 30s 竖屏宣传片 `inkstrike_xhs_30s.mp4`、`发布说明.txt`(配乐署名:Kevin MacLeod《Clash Defiant》CC BY 4.0,发布时必须署名)、`tools/director.js + capture.js`(导演脚本 + 逐帧录制器,可重新生成视频)。

## 10. Revision 02 — 2026-09-27

- `G.teamSize` 替代固定每队 5 人；菜单 `G.set.battleSize` 为 auto/5/8/12。HUD 存活数、生成队伍及人数变更均使用它。
- `samplePerformance` 仅采真实 RAF，排除隐藏/暂停/菜单和人工步进。300 样本，或至少 30 样本且累计 8 秒后，按 p90 帧间隔与 CPU 提交耗时推荐下一档。p90 >28ms 或 CPU >20ms 降一档；p90 <19ms 且 CPU <10ms 升一档。停顿帧仍计入，避免极慢设备无法降档。阈值为当前启发式，非跨设备帧率保证。
- `resizeRoster` 仅在下一竞技回合开始调用，保留玩家经济/比分；死斗在下一局采用推荐人数。手动档不调整。靶场仍为 5 个距离假人。
- `bombReset` 分配 Bot `slot/squad/lane/role`；`botCoverGoal` 避免队友目标重叠，`botObjective` 负责突击、护送、侧翼、交叉架点和单人拆核，其余人掩护。观察字段 `b.intent` 表示当前意图。感知精度 `DIFFS` 未提高。
- `disposeBotModel` 仅释放独占材质及队友标记，共享人物/武器几何保留。`smokeClear` 释放烟云独占几何。
- `inkBlock/inkLimb/finishGun/viewGlove` 位于 weapons.js，actors.js 依赖它们，脚本加载顺序必须保持 weapons 在 actors 前。
- `clearInput/unlockUI` 统一处理采购、暂停和地图；打开 UI 会释放 Pointer Lock，关闭后请求恢复。内嵌面板和自动化环境可降级非锁定模式，真实浏览器 Pointer Lock 仍需设备体验验收。
- `touchReset` 处理失焦、多指释放和布局编辑；默认线性瞄准，`touchAccel` 可开关；烟雾/闪光阻断自动瞄准。
- 设置新增 `quality`（low/balanced/high，对应像素比上限 1/1.5/2）、`motion`（仅装饰镜头摇晃，真实后坐保留）、`battleSize`、`autoTeamSize`、`touchAccel`。旧设置与熟练度存档保留。
- `M` 打开俯视地图；采购支持鼠标/触屏与数字键。地图与采购期间战斗继续，阻断玩家移动/开火/跳蹲输入。
- `window.render_game_to_text()` 提供测试状态；`advanceTime(ms)` 进入手动模拟步进（刷新退出）。原 `frame(dt)` 仍可调用。
- 回归：原 smoke、`upgrade-check.js`（交互/人数/AI/触控）、`raycheck.js`（固定射线等价性与微基准），`profile.js`（三轮真实 RAF）。生成证据在忽略的 `outputs/revision-02/`。
- 未做：联机、第二张完整地图、骨骼 IK、移动设备实机性能认证。

### Revision 02 线上发布 — 2026-09-27

- 用户追加授权后已同步发布 Cloudflare 两个目标；运行时代码为 `f906695`，合集文案提交为 `2443e1c`。
- Pages 生产部署：`3995b107-bb5f-4025-983a-6cf183f7e1b0`；Worker 版本：`d75ea8cd-4f79-48c6-bdbc-e7e823059b78`。
- 发布前再次 `SMOKE OK`；线上两入口三模式启动正常，竞技/死斗 12v12（23 Bot）、靶场 5 假人；全部 9 个 JS 与本地提交哈希一致。合集桌面/手机尺寸无横向溢出，点击可进入游戏，无页面错误；统计 API 正常，www 路径通过。
- 合集增量变更 9 个文件，其余 423 个本地资产哈希不变；未执行 GitHub push。发布证据在 `outputs/revision-02/release/`（Git 忽略）。


## 11. Revision 03 — 模拟评测与独立视觉验收（历史）

本节记录 R03 行为；R04 的用户实玩反馈覆盖了其中部分规则，尤其是敌方雷达标记。当前行为以 §12 与运行代码为准。

- 完整 20 项建议与结果见 `REVIEW-R03.md`，独立画面记录见 `DREAM-LOOP-R03.md`。模拟评测不代表真实职业选手或 Valve 参与；Dream Loop 是独立审查流程，未假称调用同名第三方服务。
- `markSpotted(e, observerTeam, now)` 写本队最后目击快照。雷达与战术图读取 `spottedBy[team]` 的冻结坐标，1.5s 过期；声音不写视觉情报。
- Bot 丢视野改瞄 `lastSeen/lastAimY`，重新看见重置反应时间。`botHear(..., kind)` 对遮挡声衰减并加位置误差，玩家/机器人脚步均使用 `step`。`resetBotAwareness` 断开上一条命的感知、道具、姿态缓存。
- `botUtilityPlan` 区分烟墨封线、曝光安全投掷、墨爆清理；`botNadeLanding` 用相同重力和反弹估算 fuse 时位置，每 .45s 缓存一次，检查预测落点友军风险。此估算非精确战术求解器，真实变帧率轨迹存在差异。
- `issueOrder(A/B/rally/auto)` 只指挥最近最多 3 名合适队友，12s 有效，墨核关键任务优先；`passCore()` 限当前持有人、5m 内视线可达的活队友。键盘 G 或地图按钮操作。
- DM `spawnSafety` 在 18 个候选中按距离、敌方视线、拥挤评分；1.25s 保护在开枪/近战/投掷后立即取消。竞技结算后冻结攻击伤害与装备变更；死亡清空护甲和保枪标志。
- `TRAIN` 位于 progress.js：T 开始/重来、Y 切静止/横移，手机在地图内操作；30s 记录实际扳机发数、命中发数、爆头、击倒、有效伤害，霰弹一发多弹丸仍只算一发命中。地图/采购/暂停不走训练时钟，训练不增加熟练度。计时训练临时禁用触屏自动开火，保留用户的辅助设置。
- `rebuyBill/rebuy` 根据上一套主副武器、护甲、道具补齐，预算不足不部分购买；采购页显示总额、余款和下一败局收入。`clearCombatFeedback` 与 `clearInput` 在重生/重开清理视觉和输入残留。
- `MAP.setDetail` 裁剪 low 的非战术装饰批次；新增四处整数网格印务掩体切断中路连续长线。纸面地坪分区、门板横闩和 B 门楣强化可读性，所有挡路实体继续通过 solid 注册。
- 人物上/下腿分段弯曲保持靴底接地，`ACTOR_SHADOW` 是共享实例化接触暗部；离地淡出，不是真实世界阴影。22m 以外过滤短内部线段；近远几何共享缓存，资源测试要先预热所有武器。
- 仍是 9 个运行时 JS，无外网资源、无构建。新增验证命令：`node tools/revision-check.js`、`node tools/ai-check.js`、`node tools/visual-review.js`。性能输出可指定 `PROFILE_FRAMES=900 PROFILE_OUT=outputs/revision-03/performance.json node tools/profile.js`。
- 设备边界：浏览器触屏模拟和本机 Chromium Metal 已测；真实手机触感、热量、长时间帧率和真人竞技平衡尚未验证。保持该边界，不能把独立视觉通过外推成完整商业品质认证。


## 12. Revision 04 — 九项实玩反馈（2026-09-28）

本轮以用户实际体验修订 R03，详细清单见 `REVIEW-R04.md`，独立图像验收见 `DREAM-LOOP-R04.md`。评测和 Dream Loop 是本地代理协作审查；没有 Valve 团队、真实职业选手或第三方 DreamLoop 服务参与认证。**R04 已完成双站生产发布，版本与线上验收记录见本节末。**

| # | 当前行为 | 入口 / 关键实现 |
|---|---|---|
| 1 | 小雷达、战术图不画敌人，已目击敌人也不显示；保留队友、点位及规则允许的墨核 | `drawRadar / drawTactical`；Bot 的目击/听觉信息仍用于自身决策 |
| 2 | 狙击近失弹、受击、目击队友倒地触发有限信息避险；寻找实体掩体并短时绕开危险路径 | `botOnShot / botOnDamage / botOnDeath`、`botFindCover / botTacticalMotion / botDangerDetour`；重生重置感知 |
| 3 | 竞技阵亡后可用上一名/下一名按钮或左右方向键切换存活队友；触屏开火/镜刺分别下一名/上一名 | `cycleSpectator`、`#specControls`；重生/结束/退出隐藏观战控件 |
| 4 | 12 个触控按钮各自选取、拖动和缩放，叠加全局比例；摇杆圆环单独设比例，旋钮同步缩放，拖动圆环可固定中心 | `layoutSelect / layoutApply / layoutJoyScale / layoutJoyCenter`；恢复当前或全部重置，位置按尺寸夹取到边界 |
| 5 | 可选鼠标/触控板输入档；Mac 无旧设置时默认触控板，非锁定使用 CSS 光标差；无事件后不继续漂移，触控板档禁滚轮惯性切枪 | `mouseLook / resetLook`、`G.set.aimMode`；H 按住移动光标而保持视角，Z 开火，V 镜/副攻击 |
| 6 | 菜单可选纸镇、折页货场、双井沙城，切换保存后刷新并保留当前模式/阵营/难度 | `MAP_CATALOG / configureMap / buildMap(scene,G.set.map)`；原创新图，非 Valve 文件或等比例复刻 |
| 7 | 折锋 `scribe`、巡纸 `scout`、守砚 `warden` 三套整套装备预设，有真实模型预览，选择同步己方小队和第一人称手套 | `ACTOR_STYLES / setActorStyle / updateActorPreview`；共享体型、动画、命中盒，不是逐部件组合器 |
| 8 | 六至九杀各有文案，十杀以上显示真实连杀数；快速击倒合并播报，死亡/回合重开/退出取消旧回调 | `STREAK / streakTitle / PROG.resetStreak`、`streakEpoch`；竞技按回合连杀，死斗沿用时间窗口 |
| 9 | M4 全息和飞白反射低倍瞄具保留周边视野及枪模，射击后保持瞄准；狙击两档 FOV 46°/26°，开镜稳定 0.38s，射击循环 1.65s，移动散布增大 | `WEAPONS.optic / adsFov`、`VM.ads`、`curSpread / updateCamera`；右键/V 切换瞄准。狙击仍可能一枪击倒，不承诺取消高伤害 |

### 地图与全局数据契约

`MAP_CATALOG` 是展示目录，键为 `papertown / warehouse / dunes`，条目包含 `id / name / en / description / siteNames`；`siteNames` 是 A/B 名称。`configureMap` 将选择的数据写入同一个全局 `MAP`，后续代码必须读取当前 `MAP`，不要再次硬编码纸镇位置。

| 字段 | 数据与用途 |
|---|---|
| `MAP.id/name/en/description/siteNames` | 当前地图身份、菜单/战术图文案 |
| `MAP.W/H/ox/oz`、`bounds` | 网格为 128×112，原点 (-64,-56)；`bounds:{x1,x2,z1,z2}` 限定各图可导航活动范围，货场比总包络小 |
| `spawn.red/blue` | `{x1,x2,z1,z2}`；竞技出生与采购区域，导航 flood 从红方出生区中心开始 |
| `sites.A/B` | `{x1,x2,z1,z2,y,name}`；墨核合法范围及楼面高度。`SITES = MAP.sites` 按引用绑定，须保留 sites 与 A/B 子对象并原地更新 |
| `points`、`zones` | 战略点 `{n,x,z,red,blue}` 与区域 `[x1,z1,x2,z2,label]`；`SHORT / MARKET` 供攻方侧翼路径使用，不能遗漏 |
| `rangePlayer`、`rangeSpots` | 玩家 `{x,y,z}`；五靶 `{x,z,d}`，d 为显示距离。`RANGE_SPOTS = MAP.rangeSpots`，数组须原地 splice；玩家初始朝向指向首靶，不能固定纸镇朝向 |
| `menuCamera` | 作者数据 `{x,y,z,tx,ty,tz}`；配置后派生运行时 `pos:[x,y,z] / target:[tx,ty,tz]` |
| `midHold`、`surfaces` | 中路守点矩形及 `face:{x,z}`；脚步区域 `[x1,z1,x2,z2,material]`，替代新图使用纸镇坐标判断 |
| `solids / ladders / buckets`、`fh / ok / reach / pen` | 当前图的碰撞、梯子、射线桶、楼面/导航/可达/贴墙代价缓存；新图没有梯子时为空，不继承纸镇梯子 |
| `root / renderLayers / setDetail` | 当前图场景组、分层渲染及低画质裁剪；碰撞、重要掩体与导航不因画质改变 |

`buildMap` 清理旧地图的几何、贴图与线材质登记，重置射线编号/命中缓存及 A* 缓存，再生成场景、重建 buckets/nav/mini。单元验证可重复调用它检查清理；产品切图仍走菜单保存后刷新，不在运行中的对局直接热换图。URL `?map=warehouse` / `?map=dunes` 供验证，优先于存储值；菜单选图清除此查询参数。

三图都使用本作墨核 A/B 规则。货场包含南装卸院、三入口大厅、交错货垛与北侧双点；沙城包含东长道、内侧短道、偏置中门、西侧有顶隧道和北侧轮转街。新增结构坐标均为整数，真实门洞与可视碰撞一致；每图的训练靶、区域提示与点位标志独立配置。

### R04 验证入口与边界

以下工具自行启动本地静态服务器并查找 Playwright；不需要另开 8765 服务。R04 相关证据输出到 Git 忽略的 `outputs/revision-04/`。

| 命令 | 覆盖 |
|---|---|
| `node tools/feedback-check.js` | 真实菜单选图刷新、装备预览、敌方地图标记为零、观战按钮/方向键、非锁定鼠标/触控板事件、H/Z/V、M4/飞白瞄具及狙击稳定/FOV |
| `node tools/tactics-check.js` | 反狙击/受击/目击倒地触发、有限情报、掩体路径和危险区域、装备切换状态保留、连杀播报生命周期 |
| `node tools/touch-layout-check.js` | 按钮/圆环独立尺寸、拖动/夹取、多指取消、恢复/保存/重载、触屏观战和窄屏摇杆范围 |
| `node tools/map-check.js` | 三地图各模式，竞技/死斗 12v12、靶场五靶；导航路径、出生视线、训练视线、射线一致性、低画质物理不变和连续重建清理 |
| `node tools/map-check.js --geometry` | 快速重跑地图空间与重建检查，跳过完整模式步进；输出单独的 `map-geometry-check.json` |

保留基础门槛 `node --check` 全部 JS、`node tools/smoke.js`（`SMOKE OK`）以及浏览器实际查看。R03 的 `upgrade-check.js / revision-check.js / ai-check.js / raycheck.js` 继续作为回归，历史断言须服从 R04 明确变更的规则。真实性能用 `PROFILE_FRAMES=900 PROFILE_OUT=outputs/revision-04/performance.json node tools/profile.js` 单独运行，避免同时运行其他 GPU 测试。

地图专项已覆盖 45 个战略点（17/13/15）、683 条两两路径、17,333 条出生区域配对射线、15 个训练靶和 30,000 条分桶/线性射线；连续六次重建保留共享引用且无场景根/线材质增长。三图完整模式测试均完成两回合结算、死斗击倒和五靶初始化。这些验证证明功能链路可运行，不足以证明长期阵营平衡。

本地整合验证另有 `feedback-check` 26 项、`touch-layout-check` 20 项、`tactics-check` 46 项通过。反狙击复审覆盖紧急拆核取消旧避险、低墙露头拒绝、仅蹲姿有效的掩体以及胸部遮挡，避免只凭眼点被挡就认定安全。最终发布前的 smoke 与部署记录由负责人续填。

性能记录见 `REVIEW-R04.md`：本机 Apple M5 Max、Chromium Metal、1440×900、balanced、DPR 1.5、纸镇 12v12 死斗，三轮各 900 个真实 RAF 帧，帧间隔 p95 为 17.5/17.2/17.5ms，JS 提交 p95 为 1.5/1.7/1.8ms，shader 增长为 0、页面错误为 0。该样本不代表其他地图、真实手机或其他设备。

独立图像审核确认新图空间可读、瞄具中心对齐、三套预设可区分；触控作者之外的代理另查 844×390 默认按钮可点击及缩放保存。新场景细节丰富度仍为部分通过。浏览器触屏模拟、本机 Chromium Metal 与自动事件测试不能代替真实手机性能、物理触控板手感、声音听感或外部职业玩家测评。R04 双站实际验收结果记录如下。


### Revision 04 双站发布 — 2026-09-28

- 运行时代码提交 `86e5141`，斑码盒子介绍提交 `278428d`；均已在本地提交，没有执行 GitHub push。
- Cloudflare Pages 生产部署：`815eaaec-86b5-4de7-8087-2a4f87892770`，入口 https://inkstrike.pages.dev/ 。
- 斑码盒子 Worker 版本：`baadf5fe-5892-4b38-8e08-c7a8a52d1329`，入口 https://banmabox.com/inkstrike/ ，同时确认 www 域名可访问。
- 两个线上入口的全部 9 个 JS 均与发布提交 SHA-256 一致；主站 HTML 一致，合集 HTML 仅含预期的单次统计注入。
- 两站均实际加载并运行竞技/死斗/靶场、30秒训练，以及菜单切换三地图后进入12v12；所有页面错误和请求失败均为0。合集1440×900/390×844首页无横向溢出，卡片跳转正确，现有 `/api/stats` 返回200和有效JSON。
- 合集增量更改10个文件（游戏资源及介绍），其余422个资产哈希不变；没有改Worker逻辑、D1数据或其他游戏。
- 证据：`outputs/revision-04/release/`。预发布完整合集备份仍在本次独立发布临时目录；源码提交与部署ID可用于版本追溯。


## 13. Revision 05 — 再次玩家旅程与系统边界验收（2026-09-28）

详情见 `REVIEW-R05.md`。本轮沿用 R04 的三地图、最多12v12和九项反馈成果，修复13项新复现问题。仍是9个运行时JS，缓存版本 `revision-05`。

- `progress.js` 熟练度解锁只刷新VM皮肤模型，保留换弹/检视/开火动画和玩家瞄准、开火时点；不再误调用切枪。
- `game.js` 保留靶场前阵营并退出恢复；新局同步清空feed DOM；菜单恢复设置FOV及滚动原点；Esc优先关闭外观/武库。
- `lock(recover)` 区分临时拒绝与不支持，阻止并发请求；死亡后复活尝试接回原生指针锁，失败时 `#captureMouse` 提供点击重试。只有不支持未调整原始输入时才改用普通锁定重试，临时拒绝不强制降级。
- 触控竖屏遮罩期间暂停；恢复横屏须主动继续。布局编辑失焦保留冻结状态和摇杆，避免同时显示暂停层；窄屏弹药栏与HP分离，提示点按换弹。
- `bombPlant` 校验核体碰撞、地面支撑及点位，向前偏移不安全则落脚下；`canDefuse` 要求有效交互视线。
- `botRecoverPath` 仅现有卡住1.6秒重寻路时调用：扫描3.5m范围内可达网格，用真实身体扫过靠近路径再接原A*。不传送、不放松碰撞、不修改正常导航逻辑。

新增自起服务器工具：`node tools/player-journey-check.js`（有窗口原生鼠标锁定）、`node tools/mobile-journey-check.js`（触屏多指/旋转）、`node tools/lifecycle-check.js`（异步解锁与跨局）、`node tools/soak-check.js`（三图长局与目标控制案例）。最终长局可用 `SOAK_SEEDS=502 SOAK_OUTPUT=outputs/revision-05/systems/final node tools/soak-check.js` 复跑；所有证据在 Git 忽略的 `outputs/revision-05/`。

行为验收：32桌面、59触屏、11生命周期、15互动边界及门角恢复通过；既有226项回归、语法和最终SMOKE OK。最终种子502三图共35回合/3778.26模拟秒全部结束，0无目标/非法位置/页面错误；货场仍出现一次9秒友军让路后自行恢复。该样本不证明长期攻防平衡。

真实Mac上的有窗口Chromium与浏览器触屏模拟均运行；独立评测者实际查看渲染截图。未验证物理手机、Safari引擎或触控板硬件手感，也没有Valve/外部职业玩家参与。本机 Apple M5 Max / Chromium Metal，1440×900、balanced、DPR1.5、纸镇12v12死斗，三轮各900个真实RAF帧：帧间隔中位数均16.7ms，P95为17.5/17.8/17.3ms；JS提交P95均2.1ms，页面错误0。预热后program数量增加0/1/1，未将其描述为零增长；单次新增编译不是资源泄漏结论。性能采样时其他测试浏览器已关闭。此结果不外推到手机或其他设备。 双站已发布并验证，记录见下文。


### Revision 05 双站生产发布 — 2026-09-28

- 运行时代码提交 `affb746`，独立分支 `codex/revision-05-playtest`；没有执行 GitHub push。
- Cloudflare Pages：`cb7323b2-031e-428f-9d04-8c7e7b34f205`，入口 https://inkstrike.pages.dev/ 。
- 斑码盒子 Worker：`65eb86ce-c959-461c-ab31-cc859103826e`，入口 https://banmabox.com/inkstrike/ 。
- 两站线上全部9个JS与发布源码 SHA-256 一致；Pages HTML一致，合集HTML仅保留预期的单次统计注入，共20项文件校验通过。
- 两入口均实际加载竞技/死斗/靶场、30秒训练，并从菜单切换全部三图进入12v12；页面错误及请求失败均为0。合集首页1440×900与390×844无横向溢出，卡片跳转正确；www入口与现有统计API均返回200。
- 合集仅变更6个游戏文件，其余426个资产哈希不变；没有改Worker逻辑、D1或其他游戏。发布前完整备份保留在独立发布目录。
- 已实际查看线上菜单R05和手机合集卡片截图。证据见 `outputs/revision-05/release/`，含部署日志、版本ID、哈希和浏览器结果。

## 14. Revision 06 — 经典布局重做与步态（2026-09-28，Claude 独立审核）
- **审核结论**：R04/R05 新增的两张图由简化的 `buildArena()` 生成，只有裸盒子，没有纸镇的立面/道具/投影词汇；人物步态用正弦摆腿（±0.24m），与 5m/s 移动不匹配，支撑脚世界速度 3–6m/s → 看起来在地上滑。
- **地图框架**：`buildPaperTown` 改名 `buildWorld`，布局前的词汇（`building/block` 立面、`crate/barrel/car/truck/palm/stall/lamp/bunting/sign`、投影、天际线、远山）对所有地图共享；非纸镇地图由 `MAP_LAYOUTS[id](K)` 提供布局。`buildArena` 已删除。`layoutKit` 新增 `crateB`（任意尺寸箱）、`ramp`（1m 深/0.25m 高台阶）、`wall`（带压顶）、`leaf`（门扇）、`arch`、`beams`、`hang`。
- **双井沙城 DUNE COURT**（经典沙漠爆破图节奏，全部原创命名）：进攻方南广场 → 长道外廊 → 长道双门 → A 长道 → 长坡上 2m 高台 A 点（日晷）；中路拱门 → 中路 → 中门（偏开门扇）→ 守方中路；中路东侧台阶上猫道 → A 小道拱门；西侧 B 上隧道（有顶/木梁/吊灯）与下隧道连中路 → B 井院（后平台、井、推车、B 门与 B 窗）。中门后 10m 的箱堆挡住出生点对视，同时保留中门视线。
- **折页货场 STACK DEPOT**（工业仓库图）：A 点在带天窗条、吊车梁、悬吊货柜、装卸高台（1.25m）的装运大厅内，入口为南侧半开卷帘门（A 主道）、西侧 A 侧廊门、守方侧门；B 点在龙门吊集装箱场；中路 Z 形屏障货柜 + 半落卷帘闸门；装箱间（有顶）连中路与 A 主道。
- **网格规则**：非纸镇地图 x/z 严格整数、高度 0.25m 分级（`map-check` 已同步）；`solid(..., {vis:false})` 的道具碰撞在非纸镇地图自动吸附 1m 网格，所以复用的纸镇道具可直接用（棕榈/木桶中心放 n+.5，车/卡车放整数）。小地图把可站立的台面（高台/猫道/台阶）画成地面而非障碍。
- **步态**（`animSoldier`）：由真实位移（不是意图速度）在模型局部坐标求速度；支撑相脚线性后移 2A、摆动相平滑前移并抬脚；步频 = 速度×支撑占比/2A，跑步支撑占比降到 0.32 形成腾空期；髋部按步幅降低保证腿够得到地，含上下起伏、前倾、躯干/头部反向微摆、脚跟着地/脚尖蹬地；原地转身会小碎步；腿的侧摆用 `ZXY` 欧拉顺序保证侧移不缩短。实测支撑脚世界速度：走 0.10、跑 0.22、横移 0.26、后退 0.27 m/s（旧版 3.1–6.4）。
- **验证**：全部 `node --check`；`smoke.js` OK；`map-check.js`（三图 12v12 竞技/死斗/靶场、导航、出生对视、射线缓存）OK；`ai-check`/`tactics-check`/`revision-check`/`lifecycle-check` OK；浏览器实际运行 dunes 死斗无控制台错误。
- **R06 发布（用户授权提交并部署三处）**：运行时提交 `482c1ea`，已快进推送 `main`（GitHub Pages 构建完成）；Cloudflare Pages 部署 `5b0f1e48`；斑码盒子介绍提交 `ca63494`，Worker 版本 `124701ce-6c9a-49f7-8444-cd309a31841d`，其余 411 个资产哈希不变。四个入口（含 www）全部 9 个 js 与提交逐字节一致；三站实测 dunes / warehouse 竞技回合正常结束、控制台 0 错误。
