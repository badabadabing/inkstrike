# INK STRIKE 墨线突击

线稿 / 排线风格的浏览器第一人称射击游戏。支持 5v5 / 8v8 / 12v12 对战 Bot 和按实战性能调整人数的自动档,支持键鼠与手机触控(按钮可自定义布局)。

- **竞技**:进攻方安放墨核、防守方拆除,回合经济买枪,先取 7 胜;Bot 分工突击、护送、侧翼，分散架点、回防拆核与掩护，并会避让友军火线
- **死斗**:无限重生,先取 40 击倒
- **靶场**:固定弹道练枪(每把枪的弹道每次都一样)
- 烟墨弹 / 曝光弹 / 墨爆弹,梯子与蹲跳,连杀播报、MVP、伤害统计,武器熟练度解锁笔触皮肤

- 纯静态站点,零外部依赖(three.js r160 与字体均在 `vendor/`)
- 本地运行:`python3 -m http.server 8765`,打开 http://localhost:8765(Mac 可双击 `start.command`)
- 调试:URL 加 `?auto` 跳过指针锁定,`?touch` 在桌面强制开启触控界面

three.js © three.js authors (MIT)。字体:Architects Daughter (Apache-2.0)、IBM Plex Mono (OFL-1.1)。

## Revision 02

- 纸镇三个地标：A 刻度台、B 印运仓、中路折页门；路线标识与全目标导航修复。
- 倒角纸模人物、分节手套和枪械结构细节，保持原创纸白墨线画风。
- `M` 战术地图，`B` 可鼠标点击采购；暂停设置可调画面精度、镜头晃动和触控加速。
- 自动人数：新设备键鼠从 8v8、触控从 5v5 开始；竞技仅在下一回合调整，死斗在下一场采用推荐人数。手动人数不自动变动。
- 测试：`node tools/smoke.js`、`node tools/upgrade-check.js`、`node tools/raycheck.js`。后两项的运行方式见各脚本开头。
- 性能采样：启动本地服务器后运行 `node tools/profile.js`，输出三轮 12v12 的真实帧间隔与 JS 提交耗时。

本轮参考 Valve 公开的 [角色与环境可读性论文](https://cdn.fastly.steamstatic.com/apps/valve/2007/NPAR07_IllustrativeRenderingInTeamFortress2.pdf) 和 [角色对比度说明](https://blog.counter-strike.net/pt-br/2020/06/30482/)，无 Valve 团队参与或授权背书。浏览器本地测试不替代手机真机手感验收。
