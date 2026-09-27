# INK STRIKE 墨线突击 · 交接文档

> 给接手的 Agent(GPT / Codex / 其他)和开发者。先读 `AGENTS.md`(硬规则),再读本文(架构、改法、待办)。

## 1. 这是什么

线稿 / 排线画风的**浏览器第一人称射击游戏**,玩法对标 CS:5v5 对战 Bot。

| 模式 | 规则 |
|---|---|
| 竞技 `comp` | 红方进攻:把「墨核」带到 A/B 点安放(3.2s),40s 后引爆;蓝方防守:拆除(6s)。回合经济买枪,先取 7 胜 |
| 死斗 `dm` | 无限重生,先取 40 击倒或 8 分钟 |
| 靶场 `range` | 5 个固定距离假人 + 12m 弹道墙,免费取枪,练压枪 |

- 画风:纸白底 + 墨线描边 + 排线阴影;颜色只用在血(红)、红/蓝阵营、火光/点位(琥珀)、玻璃、木纹。
- 平台:桌面键鼠(Pointer Lock)+ 手机触控(浮动摇杆、可拖动按钮布局、辅助减速、自动开火)。
- **线上**:https://inkstrike.pages.dev (Cloudflare Pages) · https://badabadabing.github.io/inkstrike/ (GitHub Pages)
- **仓库**:https://github.com/badabadabing/inkstrike(public,main 分支)

## 2. 技术栈与运行

- 原生 JavaScript(非 ES module 的普通 `<script>`,**全局作用域共享**)+ three.js r160。无构建、无 npm 依赖。
- 第三方全部在 `vendor/`(three.js、LineSegments2 线条 addon、字体)。**禁止加外链**(大陆访问问题)。
- 本地运行:
  ```bash
  python3 -m http.server 8765        # 在仓库根目录
  # 浏览器打开 http://localhost:8765     调试: ?auto 跳过指针锁定   ?touch 桌面强制触控界面
  ```
- 冒烟测试(无头浏览器,自带静态服务器,**每次改完必跑**):
  ```bash
  node tools/smoke.js      # 输出 SMOKE OK 才算过;需要 playwright(脚本里有查找逻辑,找不到会提示安装)
  ```
- 部署(先 commit):
  ```bash
  tools/deploy.sh          # git push → GitHub Pages 自动构建;wrangler → Cloudflare Pages
  ```
  本机 `gh` 已登录 `badabadabing`,`wrangler` 已登录。换机器需要 `gh auth login` 和 `wrangler login`。

## 3. 文件地图(加载顺序即依赖顺序,见 `index.html` 末尾的 `files` 数组)

| 文件 | 行数 | 职责 | 关键符号 |
|---|---|---|---|
| `js/core.js` | ~275 | 调色板常量、数学工具、**排线着色器** `fillMat`、线材质 `lineMat`、**草图构建器 `Sk`**、程序化贴图、**合成音效 `SFX`** | `PAPER INK RED AMBER BLUE`, `Sk`, `SFX.shot/step/...`, `SFX.SHOT`(每把枪声学参数) |
| `js/map.js` | ~346 | 地图「纸镇 PAPER TOWN」:建筑/掩体/道具/远景;碰撞;射线;导航网格 + A* | `MAP`, `buildMap`, `solid()`(碰撞+可视一次注册), `moveEntity`, `rayWorld`, `segClear`, `navPath`, `MAP.points/zones/spawn/ladders` |
| `js/weapons.js` | ~159 | 武器数值、**固定弹道** `mkPat`、线稿枪模 `GUNS`、第一人称视图模型 `VM`(后坐、换弹、拉栓、检视动画、皮肤) | `WEAPONS`, `BUY_LIST`, `GUNS`, `worldGun`, `VM` |
| `js/actors.js` | ~144 | 士兵模型(按阵营红/蓝墨线)、命中盒(头/胸/腹/腿)、**Bot AI** | `DIFFS`(难度表), `makeBot`, `botThink`, `botGoal`, `updateBot`, `rayEnt`, `groundMove` |
| `js/fx.js` | ~54 | 墨点弹孔/血迹贴花(InstancedMesh)、粒子、曳光、枪口火、爆炸环 | `FX` |
| `js/objective.js` | ~87 | 墨核安放/拆除、Bot 目标脑(攻/守/保枪/预瞄)、烟墨弹、曝光弹、梯子、地面材质 | `BOMB`, `SITES`, `bombUpdate`, `botObjective`, `botHoldYaw`, `smokeSpawn`, `smokeBlocks`, `flashBang`, `ladderAt`, `surfaceAt` |
| `js/progress.js` | ~33 | 连杀播报、MVP、伤害统计、武器熟练度与笔触皮肤 | `PROG`, `SKINS` |
| `js/touch.js` | ~78 | 手机触控、辅助减速、自动开火、**可拖动按钮布局** | `TOUCH`, `initTouch`, `updateTouch`, `layoutApply`, `layoutEdit` |
| `js/game.js` | ~289 | 全局状态 `G`、输入、玩家移动/射击、伤害/击杀、回合流程与经济、采购、HUD、雷达、相机、主循环 | `G`, `frame`, `updatePlayer`, `playerFire`, `fireBullet`, `hurt`, `kill`, `startMatch`, `startRound`, `endRound`, `updateFlow`, `buy`, `updateHUD` |
| `index.html` | ~272 | 全部 CSS、HUD/菜单/采购/暂停/武库 DOM、importmap、脚本加载器 | |

## 4. 核心机制速查

**主循环** `frame(dt)`(game.js 末尾):`updateFlow` → `updateTouch` → `updatePlayer` → 各 Bot `updateBot` → `updateNades` → `bombUpdate` → `smokeUpdate` → `FX.update` → `updateCamera` → `VM.update` → `updateHUD` → 渲染世界 + 叠加渲染视图模型。`G.timescale` 做慢动作。

**状态机** `G.state`:`menu → freeze(准备,可采购)→ live → roundEnd → …… → matchEnd`。死斗/靶场直接 `live`。

**渲染画风**:所有几何经 `Sk` 累积后 `bake()` 成 **1 个填充网格 + 1 个线段网格**(每个大物件 2 次 draw call)。
- 填充着色:顶点属性 `tone`(0 白、0.33 单向排线、0.66 交叉排线、1 实心墨)+ `tint`(底色)。`Sk('sun')` 按太阳方向自动给侧面/底面排线。
- 描边:`EdgesGeometry` 提取折边 → `LineSegments2`(屏幕像素宽,需 `resolution`,已在 `onResize` 统一更新 `LINE_MATS`)。
- 新增物件:在 `buildMap` 里用 `solid(x1,z1,x2,z2,y0,y1,opts)`(会同时进碰撞和导航)或纯装饰 `sk.box/cyl/prof/line`。

**射击**:`playerFire` → `fireBullet`(射线打实体 `rayEnt` / 打世界 `rayWorld`,薄物体可穿透一次)→ `hurt`(护甲、部位倍率 头×4 腹×1.25 腿×0.75、距离衰减 `fall`)→ `kill`。后坐 = `WEAPONS[k].pat[n]` 固定踢量(+极小噪声),散布 = `curSpread`(移动、空中、连射、蹲)。

**Bot AI**(actors.js + objective.js):
- `botThink` 每 ~0.1s:视野锥 + `botSee`(射线,被烟挡)选目标 → 反应时间 `DIFFS.react` 后开火,误差 = `aimErr + 距离项 + 连射项 + 双方移速` × `DIFFS.err`。
- 无目标时 `botGoal`:竞技模式先问 `botObjective`(攻方去计划点/守包,守方守点/回防拆包/残局保枪/按队友报点转点),到点后 `botHoldYaw` 预瞄敌人来路。
- 被卡住会跳/换路;听到枪声脚步 `botHear` 会转头或追。

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

**本地存储**:`localStorage.inkstrike`(设置:灵敏度、FOV、音量、准星、触控灵敏度、按钮布局)、`inkstrike_prog`(熟练度、皮肤、MVP)。

## 5. 常见扩展怎么做

- **加一把枪**:`WEAPONS` 加条目(`slot` 1 主/2 副/4 投掷,`snd` 指向 `SFX.SHOT` 的键)→ `GUNS[key](p)` 用 `p.body/p.mag/p.bolt` 画模型并返回 `{muzzle, lh, grip}` → 需要固定弹道就 `WEAPONS.key.pat = mkPat(...)` → 加进 `BUY_LIST`(采购卡片最多 10 个,数字键 1–9/0)。图标会在启动时 `makeIcons` 自动渲染。
- **加一张地图**:目前 `buildMap` 是单一硬编码函数。建议先把它重构成 `MAPS = { papertown: fn, ... }`,`MAP` 的数据字段(`points/zones/spawn/SITES/ladders`)随地图切换;`buildNav` 依赖 `MAP.W/H/ox/oz`(1m 网格,坐标用整数)。
- **加一种投掷物**:`WEAPONS` 加 `nade: true, fuse` → `GUNS` 画模型 → `updateNades` 里按 `n.kind` 分支 → `NADES` 数组(game.js)加键 → `BUY_LIST`。
- **加一个模式**:`G.mode` 新值;在 `startMatch`(建队伍)、`spawnEnt`(出生点)、`startRound`(横幅/发枪)、`updateFlow`(胜负)、`canBuy` 里各加分支;菜单按钮在 `index.html` 的 `#optMode`。

## 6. 代码风格(务必保持一致)

- 代码是**高密度单行风格**(一行多语句,短变量名),注释很少。新代码照此风格写,不要大面积重排格式(会让 diff 不可读)。
- 全局函数/对象互相直接调用;新文件要加进 `index.html` 的 `files` 数组并注意顺序(被依赖的在前)。
- 编辑建议用**精确字符串替换**,替换前确认锚点唯一存在。
- 改完:`for f in js/*.js; do node --check $f; done` → `node tools/smoke.js` → 浏览器实际看一眼 → commit(结尾加协作者署名行)→ `tools/deploy.sh`。

## 7. 已知问题与技术债

- 竞技模式约 40% 概率玩家自己携带墨核;玩家不下包时 Bot 只会去点位守着。可考虑:携带者 20s 不动时提示 / Bot 请求传包(按 G 丢包)。
- `map.js` 里导航点 `PIT`(A 大道旁死角)不可达,Bot 不会去;冒烟测试已豁免它。
- `hurt()` 开头有一个恒假的死条件 `&& false`;`G.huntAll` 已不再被置为 true,`actors.js` 里依赖它的分支是死代码,可清理。
- `index.html` 的脚本加载用 `?v=${Date.now()}` 强制绕缓存 → 线上每次都重新下载游戏 JS(~200KB;three.js 仍可缓存)。上线稳定后可改成版本号。
- `rayWorld` 是对全部 ~220 个碰撞盒线性遍历;Bot 数量再翻倍或加地图时考虑用 `MAP.buckets` 做 DDA 加速。
- 每个音效实时创建 Web Audio 节点;极端混战下低端手机可能卡顿,可加并发上限。
- 内嵌预览面板(IDE 内浏览器)不支持 Pointer Lock,会自动降级;真实浏览器正常。
- 真机体验(手机触控手感、按钮布局、枪声听感)尚未在实机大规模验证。

## 8. 路线图(建议优先级)

1. **联机对战**:最大的一项。推荐 Cloudflare **Durable Objects** 做房间(一个 DO = 一局),WebSocket 同步输入,服务器权威判定命中(复用 `rayEnt/rayWorld`,需把这两个和 `MAP` 抽成可在 Worker 里跑的纯函数模块)。先做 2v2 房间码 + 客户端预测/插值,再扩到 5v5。
2. **手机进阶**:陀螺仪辅助瞄准(`DeviceOrientationEvent`,iOS 需权限)、性能档位(关排线/降分辨率/减 Bot)、布局预设。
3. **第二张地图**(先做 §5 的地图重构)。
4. **Bot**:道具定点(每点位预设烟闪落点)、残局 1vN 的时间管理、狙击位。
5. **内容**:更多笔触皮肤、击杀特效、赛后总结页、段位(本地)。
6. **工程**:把 `tools/smoke.js` 接到 GitHub Actions,push 时自动跑。

## 9. 仓库外的相关资产

- `~/Desktop/inkstrike-promo/`:小红书 30s 竖屏宣传片 `inkstrike_xhs_30s.mp4`、`发布说明.txt`(配乐署名:Kevin MacLeod《Clash Defiant》CC BY 4.0,发布时必须署名)、`tools/director.js + capture.js`(导演脚本 + 逐帧录制器,可重新生成视频)。
