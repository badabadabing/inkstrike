# INK STRIKE 墨线突击

线稿 / 排线风格的浏览器第一人称射击游戏。5v5 对战 Bot,支持键鼠与手机触控(按钮可自定义布局)。

- **竞技**:进攻方安放墨核、防守方拆除,回合经济买枪,先取 7 胜;Bot 会预瞄、转点、扔烟闪、保枪
- **死斗**:无限重生,先取 40 击倒
- **靶场**:固定弹道练枪(每把枪的弹道每次都一样)
- 烟墨弹 / 曝光弹 / 墨爆弹,梯子与蹲跳,连杀播报、MVP、伤害统计,武器熟练度解锁笔触皮肤

- 纯静态站点,零外部依赖(three.js r160 与字体均在 `vendor/`)
- 本地运行:`python3 -m http.server 8765`,打开 http://localhost:8765(Mac 可双击 `start.command`)
- 调试:URL 加 `?auto` 跳过指针锁定,`?touch` 在桌面强制开启触控界面

three.js © three.js authors (MIT)。字体:Architects Daughter (Apache-2.0)、IBM Plex Mono (OFL-1.1)。
