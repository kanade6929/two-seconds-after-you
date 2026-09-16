---
name: 辰星夜
description: 夜色中的大阿卡那刻印，青色现在与暖金过去共同前行。
colors:
  night: "#090f19"
  cyan: "#b8eee8"
  gold: "#edbd88"
  text: "#d5e6e8"
  muted: "#a1b4c6"
  line: "#3c5266"
  canvas-muted: "#91a6b9"
  canvas-line: "#2b3b50"
  button: "#101c2b"
  button-hover: "#1b3441"
  primary-surface: "#213a42"
  primary-text: "#e1fffa"
  ritual-surface: "#0e1a28"
typography:
  display:
    fontFamily: '"Arcana YueSong", "Songti SC", "SimSun", serif'
    fontSize: "clamp(64px, 6.4vw, 92px)"
    fontWeight: 400
    lineHeight: 1.18
    letterSpacing: "0.12em"
  headline:
    fontFamily: '"Arcana YueSong", "Songti SC", "SimSun", serif'
    fontSize: "30px"
    fontWeight: 400
    letterSpacing: "0.08em"
  body:
    fontFamily: '"Arcana YueSong", "Songti SC", "SimSun", serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.9
  canvas-label:
    fontFamily: '"Arcana YueSong", "SimSun", serif'
    fontSize: "12px"
    fontWeight: 400
  touch-input:
    fontFamily: '"Arcana YueSong", "Songti SC", "SimSun", serif'
    fontSize: "16px"
    lineHeight: 1.7
rounded:
  square: "0px"
spacing:
  nav-gap: "8px"
  control-gap: "10px"
  touch-edge: "14px"
  chapter-gap: "18px"
components:
  button-secondary:
    backgroundColor: "{colors.button}"
    textColor: "{colors.text}"
    rounded: "{rounded.square}"
    padding: "10px 17px"
  button-secondary-hover:
    backgroundColor: "{colors.button-hover}"
    textColor: "{colors.cyan}"
  button-primary:
    backgroundColor: "{colors.primary-surface}"
    textColor: "{colors.primary-text}"
    rounded: "{rounded.square}"
    padding: "10px 17px"
  input:
    backgroundColor: "#0c1724"
    textColor: "{colors.text}"
    rounded: "{rounded.square}"
    padding: "13px"
  chapter-card:
    backgroundColor: "#101e2b"
    textColor: "{colors.text}"
    rounded: "{rounded.square}"
    padding: "18px 10px"
  ritual-panel:
    backgroundColor: "{colors.ritual-surface}"
    rounded: "{rounded.square}"
    padding: "38px 45px"
    width: "min(500px, 90vw)"
---

# Design System: 辰星夜

## Overview

**Creative North Star: "夜色中的大阿卡那刻印"**

深夜底色承托青色现在与暖金过去。纤细直线、独立牌章图腾和留白让游戏像一场安静的夜行；光点、光晕与轨迹提供柔和的时间感。成长与接纳的表达依靠行动和简短中文，不承诺占卜或治疗效果。

HTML 承担文字、按钮和表单，Canvas 承担牌阵、机关与光效。两者共用用户指定的悦宋字体和青金角色；触控布局重排内容与操作区，保留同一世界、规则和光效语言。

**Key Characteristics:**

- 夜色、青色现在、暖金过去。
- 图标与 UI 轮廓用直线，光点和轨迹可柔和弯曲。
- 全局悦宋，细线刻印，操作反馈清楚。
- PC 菜单使用系统鼠标，关内使用限速光点；手机直接触控菜单与独立底部游戏控制。

## Colors

色彩角色固定，亮度负责区分文字、机关结构和激活状态；前置令牌记录实际源值。

### Primary

- 青白 `cyan`：现在的光点、可交互强调、激活机关、悬停文字。

### Secondary

- 暖金 `gold`：两秒前的影子、牌章编号、过去侧机关和键盘焦点。

### Neutral

- 深夜 `night`：页面底色；Canvas 叠加低对比夜空渐变。
- 浅雾 `text`：任务和主要正文；蓝灰 `muted`：HTML 说明与状态。
- 雾蓝 `canvas-muted`：Canvas 标签。结构暗线 `canvas-line` 与 HTML 边线 `line` 用于轮廓，不能代替文字色。
- 按钮与仪式面板使用各自深色表面，主按钮用更明亮的青灰底和近白文字。

**The Role Color Rule.** 青色始终表示现在，暖金始终表示过去或仪式强调；不能仅靠同一颜色的微弱明暗传达操作状态。

## Typography

所有文字使用用户指定的方正清刻本悦宋简体，原始文件为 `assets/FZfont140.TTF`，网页族名为 `Arcana YueSong`。HTML 的回退为 Songti SC、SimSun、serif；Canvas 为 SimSun、serif。用户已确认可在网站嵌入并随公开 Git 仓库发布；保留原字体，不改造字形。

标题、罗马数字、按钮、正文、表单和 Canvas 标签同属这一字体。全局关闭合成字重，标题与强调文字采用正常字重。字体预加载并使用 `font-display: swap`，加载完成后刷新场景布局缓存。

- Display：辰星夜三字字标；桌面使用前置令牌，触控使用 clamp(60px, 18vw, 82px) 与 1.15 行距，触控短横屏使用 60 px。桌面高度不超过 760 px 且宽度至少 781 px 时，字标宽 370 px、文字 72 px。
- Headline：对话面板标题；游戏标题为桌面 35 px、触控 28 px，短屏可缩小。
- Body：普通段落用舒展行距，状态、提示、卡牌说明按角色缩小；触控说明保持更易读的字号。
- Canvas label：机关基础标签使用前置令牌；触控时通过场景比例补偿，使渲染字号至少相当于 11 CSS px。
- Touch input：称呼和留言统一 16 px，避免移动浏览器输入自动放大。

**The One Font Rule.** 新增控件与画布文字继续使用 Arcana YueSong，不引入另一套标题、数字或图标字体。

## Layout

桌面标题页左侧为辰星夜字标与操作，右侧为纵向刻印牌阵。顶部导航固定，游戏标题在上方、状态与操作在下方，Canvas 填满视口；牌章页默认四列，主网格上限 1220 px。常规弹层居中，社区内容宽度上限 710 px。

触控模式由粗指针媒体条件或首次触摸启用，不只依赖窗口宽度。竖屏游戏把标题、谜题、状态、拇指控制依次分区；底部光域高 126 px，确认按钮宽 96 px，安全区由 `env(safe-area-inset-*)` 留白。牌章重排为两列，标题与社区的返回按钮禁止压缩换行。

高度不超过 600 px 的触控横屏将标题与状态放到左侧 216 px 区域，谜题和控制从左边 248 px 处开始，底部控制高 98 px。通用响应断点还有宽度 1000 / 650 px 与高度 760 px，最终尺寸由 CSS 层叠共同决定。

手机相机根据可用区域、机关范围与关卡阶段适配；关卡、阶段、窗口或底部状态可见性改变时重算，同一阶段不追着光点持续缩放。星星关标签放在机关外侧，触控时使用短标签以减少遮挡。Canvas DPR 上限为 2；这些实现事实不等同于实体手机的性能验收。

安卓移动性能更新：缓存背景、光晕和视口尺寸，只在文字改变时写入状态；轨迹缓冲按局部包围盒复用。手机曲线取样为 30 Hz 几何节点，仍逐绘制帧以曲线连接，非 30 Hz 游戏逻辑。120 Hz 回放/判定与顶层光点不降速。菜单背景目标 30 FPS、关内 60 FPS；持续约 2.2 秒帧压力才分档降低 Canvas DPR 至最低 1.25，保持逻辑尺寸和 HTML 字体，不删除粒子、呼吸或光波。

## Elevation & Depth

深度来自夜色的渐变层、细框、柔光与少量暗阴影。背景和机关在最下方；HTML 界面、提示、遮罩依次叠放；关卡内青色光点位于可见界面之上，菜单中隐藏并恢复系统鼠标。弹层以深色遮罩隔开场景，维持清楚的操作层次。

- 按钮悬停使用轻暗阴影 `0 3px 22px #070c1466`。
- 提示面板使用 `0 20px 55px #04081099`。
- 仪式面板使用 `0 30px 90px #02070d88`，并以外移细框形成双层轮廓。

机关激活逻辑立即变化，视觉余光单独衰减：普通机关约 0.18 秒，出口约 0.16 秒；激活接近约 0.14 秒。界面入场 330 ms、退出 150 ms；过关光波 1.1 秒。减少动态关闭装饰运动，界面切换直接完成，过关反馈缩为 0.4 秒，规则不变。

关内换阵不硬切：旧阵 0.18 秒渐隐，新阵 0.26 秒渐亮。共 0.44 秒冻结逻辑、光点与回放，不消耗合作窗口；旧阵快照只用于绘制，不能点击。减少动态保留短透明度交接，不增加空间运动。世界环片使用短缓出旋转，减少动态直接落到新方向。

只有真实可点击时，终点才出现 1 Hz 青金呼吸光、向外扩散的八边形细框和操作标签。余光不显示可点击提示；减少动态用常亮框和文字，不闪动。

月亮的可点击状态只表示「可以确认选择」，不代表答案正确。未启动时上方显示一枚目标图腾；启动后用中性空菱形与「凭记忆选择」替代，不能保留目标残影或用独有高亮暴露正确项。三个候选使用一致的稳定时长、点击框与确认文字，每轮一次正确点击即推进。

## Shapes

HTML 按钮、输入框和面板是直角矩形，按钮右下有细小直角刻痕；Canvas 牌框使用切角折线，机关使用八边形。不要把 HTML 矩形描述成已实现的切角裁剪。

机关内八边形半径 40 负责获得占位，外八边形半径 46 是明确的释放边界，方向均为 π/8。规则按同一多边形判定，避免视觉在内、逻辑在外。印内微移稳定，离开外框同帧失效；不吸附真实光点，不篡改回放轨迹。恋人、光弦、光路以被占据的印心计算关系。

星星为八向尖芒，月亮为凹折线，太阳为菱形核心与八向射线；每张牌拥有独立直线图腾。SVG 与 Canvas 共用 `symbols.js` 路径。光点、背景星尘、发光扩散和轨迹允许圆形与曲线。

## Components

### Title Lockup

辰星夜以原悦宋三字构成主界面字标。中央“星”上移 5 px；上方冠饰由星芒、菱形、折线与刻度组成，下方细线被中央菱形打断。装饰为内联 SVG，文字仍是可访问的 HTML h1；不把字体改造成图片。常规字标容器宽度为 min(410px, 100%)，触控上限 400 px，短横屏宽 330 px。青白文字、暖金冠饰与极轻文字光晕延续现有色彩角色。

### Buttons

细框直角、最小高度 44 px；主按钮青灰填色，次按钮深夜填色。菜单悬停和按下使用原生鼠标；只有关内控件由光点命中产生，两者使用相同视觉反馈。关内上限 420 单位/秒、1600 单位/秒²，近目标缓动防抖不变。按下有 1 px 下沉；禁用态减淡并保留语义。键盘焦点为外移 4 px 的 2 px 暖金轮廓，Tab、Enter 与 Esc 路径保留。

### Inputs / Fields

深色直角输入框，细线边界、暖金插入符，与按钮共用焦点轮廓。手机使用原生触控与输入法；桌面点击、选字、滚动、键盘和中文输入法也使用浏览器原生行为，不经光点转发。服务未配置时显示真实不可用状态并禁用提交区。

### Navigation

设置导航由图标和中文标签组成；触控或窄屏隐藏可视标签，保留可访问名称与最小触控面积。触控选中状态为暖金框与暖金图标；静音加斜线，减少动态加短横标记，均对应 `aria-pressed`。返回按钮保持完整单行。

### Cards / Containers

牌章卡以双细框组织罗马编号、直线图腾、牌名与进度文案，完整卡面可点；锁定卡保持禁用语义。仪式面板用于暂停、完成和结局，居中排版并保留外侧细框。启示面板靠近下方操作区，触控时根据可用空间限高并可滚动。

### Touch Controls

菜单直接触摸；关内左侧光域接受相对滑动，也可以轻触场景选目标，右侧“确认”处理点击与按住注能。两者共享原游戏光点限速和两秒影子规则。操作文案随输入设备切换，不能给手机继续显示“只需鼠标”。

## Do's and Don'ts

### Do:

- Do 延续青色现在与暖金过去的角色关系。
- Do 让 HTML、Canvas、罗马编号和控件共用用户提供的悦宋字体。
- Do 用直线构成图标与 UI 轮廓，允许光点、光晕和轨迹弯曲。
- Do 保留可读的 Canvas 标签、星星关外侧标签和清楚的键盘焦点。
- Do 区分原生菜单输入与关内光点命中，保留 PC / 手机同一游戏规则。

### Don't:

- Don't 用未点亮的暗边框色绘制说明文字。
- Don't 在同一阶段追随光点持续缩放手机场景。
- Don't 为手机隐藏图标状态、压断返回文案或沿用鼠标专属提示。
- Don't 将静态检查、截图或模拟环境结果表述为实体手机性能验证。
- Don't 在社区未配置时展示假留言、假点赞或成功提交状态。
