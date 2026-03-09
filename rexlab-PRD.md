---
title: Rex's Lab 独立网站 — PRD
status: active
created: 2026-03-05
updated: 2026-03-09
mrd: output/mrd-rexs-lab-website.md
author: Rex + Samantha
---

# PRD — Rex's Lab（rexliu.io/lab）

## 当前定位
Rex's Lab 已不再是「独立新站待搭建」，而是 **合并在 `rexliu.io/lab/` 下的内容产品区**。

它现在承载 4 类能力：
1. **AI Timeline** — 记录 AI 时代的重要事件
2. **Daily Content** — Digest + SNEK Daily 的日更内容
3. **Builder Narrative** — Builder's Log 展示 AI 团队的推进轨迹
4. **Projects Showcase** — 对外展示 Rex 的长期实验项目

## 技术选型（2026-03-09 对齐）
- **框架**: Astro（Content Collections）
- **样式**: Tailwind CSS
- **设计系统**: 复用 `design-system/tokens.json`（品牌紫 #8953d1、暗色 #151515）
- **部署**: GitHub Actions → GitHub Pages（已上线）
- **站点路径**: `rexliu.io/lab/`（已替代 `lab.rexliu.io` 独立站方案）
- **内容格式**: 单文件双语 Markdown + frontmatter
- **仓库**: `projects/rexliu-website/`
- **搜索能力**: 已安装 `@pagefind/default-ui` + `pagefind`，`postbuild` 会生成静态索引，当前缺的是 **Lab 页面接入与范围定义**

---

## 功能列表

### F1: 首页（Landing）
一屏讲清楚 Rex's Lab 是什么。

**内容结构：**
- Hero: 一句话定位 + CTA（订阅 / 浏览文章）
- 最新 Daily Digest（最近 3 篇卡片）
- 最新 Builder's Log（最近 3 条）
- Projects 卡片（3-5 个）
- 底部：RSS 订阅 + Twitter / Telegram 链接

**设计规范：**
- 暗色背景 `#151515`，文字 `#e0e0e0`
- 品牌紫 `#8953d1` 用于高亮、链接、CTA 按钮
- Inter 字体，正文 16px，标题 24-32px
- 响应式：移动端单列，桌面端双列卡片

### F2: Daily Digest（每日精选）
核心板块——每天一篇必读文章，中英双语，附行动指南。

**数据结构（frontmatter）：**
```yaml
---
title: "文章标题"
title_en: "Article Title"
date: 2026-03-05
source: "https://原文链接"
source_name: "来源名称"
tags: ["crypto", "ai", "macro"]
lang: "zh"  # zh / en
pair: "2026-03-05-slug"  # 中英互链
---
```

**页面结构：**
- 标题 + 来源链接 + 日期 + 标签
- 语言切换按钮（中⇄英）
- 正文（翻译/精选内容）
- 🎯 **行动指南**（Rex 视角批注，独立高亮区块，品牌紫左边框）
- 上/下篇导航

**列表页：**
- 按日期倒序
- 卡片：标题 + 日期 + 标签 + 一句话摘要
- 支持按标签筛选

**内容工作流：**
1. 每日 Samantha 从 ClawFeed / daily-reading 推荐 3-5 篇候选
2. Rex 挑一篇（Telegram 回复序号）
3. Samantha 生成中英双语 Markdown + 行动指南
4. Rex 审核确认 → 自动提交到 Git → 自动部署

### F3: Builder's Log
全自动——展示「今天 AI 团队干了什么」。

**数据结构（frontmatter）：**
```yaml
---
date: 2026-03-05
agents: ["samantha", "loki", "vision", "jarvis"]
highlights: 3
---
```

**页面结构：**
- 按日期倒序，每天一条
- 时间线样式，每条包含：
  - 日期
  - Agent 头像 + 名字
  - 做了什么（一句话）
- 点击展开看详情

**内容来源：**
- `memory/sync.md` 每日条目
- Cron 运行摘要
- Samantha 每晚自动生成当日 Builder's Log Markdown 文件

### F4: Projects（项目展示）
卡片式展示 Rex's Lab 的项目。

**每张卡片：**
- 项目名 + 一句话描述
- 状态标签（🟢 Running / 🔄 Building / 📋 Planning）
- 图标或缩略图
- 点击跳转到详情页（可选，MVP 先不做详情页）

**MVP 项目列表：**
1. Lucky 启芽 — AI 英语启蒙私教
2. Alpha Radar — 每日 Crypto 情报
3. Twitter Brain — 推文策略引擎
4. Content Pipeline — AI 内容管线
5. The Workshop — 运营仪表盘

**数据：** `src/content/projects/*.md`，静态维护

### F5: 全站双语切换（i18n — 方案 C：单文件双语）

**架构决策（2026-03-06 Rex 确认）：** 采用「单文件双语 + 客户端切换」方案，不做双 URL 路由。

**核心机制：**
1. **内容层**：每个 md 文件内用 `<!-- zh -->` / `<!-- en -->` 注释标记分隔两种语言的正文；frontmatter 加 `title_zh`/`title_en`、`summary_zh`/`summary_en` 等可选双语字段
2. **解析层**：自定义 remark 插件 `remark-bilingual`，根据页面当前语言只渲染对应标记段落
3. **切换层**：右上角 🌐 toggle 按钮（EN / 中文），偏好存 `localStorage`，切换时 JS 控制显隐
4. **Fallback 规则**：没有第二语言版本的内容，自动显示原文语言，toggle 按钮标注「Translation coming soon」
5. **默认语言**：英文（匹配 Twitter 主受众），中文读者点一下切换

**适用范围（分阶段）：**
- **Phase 1（Labs 页面）**：AI Timeline（175 条标题翻译）、Digest、SNEK Daily、Builder's Log、Projects — UI chrome + 内容
- **Phase 2（全站）**：Posts、Notes — 长文章渐进翻译

**UI 字典：**
- `src/i18n/ui.ts`：所有 UI 文案（按钮、标签、导航）的中英对照，约 50-80 个 key
- 页面模板通过 `t('key')` 函数调用

**SEO 处理：**
- `<html lang>` 跟随当前语言
- `<meta>` 描述取当前语言版本
- 不生成 hreflang（单 URL 架构）
- 对 Rex 的流量来源（X/Telegram）影响可忽略

**技术实现清单：**
- [ ] `src/i18n/ui.ts` — UI 字典
- [ ] `src/i18n/utils.ts` — `t()` 函数 + `getLang()` + `setLang()`
- [ ] `src/components/LanguageToggle.astro` — 切换组件（Astro island）
- [ ] `src/plugins/remark-bilingual.ts` — 解析 `<!-- zh/en -->` 标记
- [ ] Schema 更新：所有 collection 加 `title_zh`/`summary_zh` 等可选字段
- [ ] AI Timeline 175 条批量中文标题翻译（脚本生成）
- [ ] Digest/SNEK Daily/Builder's Log/Projects 现有内容补充双语字段

### F6: RSS 输出
- `/rss.xml`（全站，已存在）
- `/rss-digest.xml`（仅 Daily Digest，待补）
- `/rss-snek-daily.xml`（仅 SNEK Daily，待补）
- 中英文分 feed 暂不单独拆，先以单 URL 内容订阅为主

### F7: AI Timeline（AI 大事记）
AI 行业重大事件时间线——模型发布、融资、产品上线、政策变动。

**数据结构（frontmatter）：**
```yaml
---
date: 2026-03-05
company: "Anthropic"
event: "Claude Opus 4.6 发布，支持 1M context"
event_en: "Claude Opus 4.6 released with 1M context window"
category: "model-release"  # model-release / funding / product-launch / policy / partnership
tags: ["anthropic", "claude", "llm"]
source: "https://链接"
---
```

**页面结构：**
- 时间线样式，按日期倒序
- 每条：日期 + 公司 logo/名称 + 事件摘要（中英双语）+ 类别标签
- 筛选器：按公司（Anthropic / OpenAI / Google / Meta / xAI...）、按类别
- Time Travel：点击日期回看当天所有事件

**内容来源：**
- daily-reading / ClawFeed / Alpha Radar 自动提取候选事件
- Samantha 每日筛选重大事件生成 Markdown
- Rex 审核确认（可批量，无需逐条）

**设计：**
- 左侧时间轴线（品牌紫 `#8953d1`）
- 右侧事件卡片
- 类别标签颜色：模型发布=紫 / 融资=金 / 产品上线=绿 / 政策=红

---

### F8: 搜索 ✅ 已上线（2026-03-09）

**目标：** 不是做全站大而全搜索，而是先解决 Rex's Lab 内容越来越多之后的查找问题。

**实现方案：Pagefind（静态搜索）**
- **原因**：零后端、适合 Astro 静态站、现成依赖已安装、支持中英文混合检索
- **架构**：
  - `postbuild` 脚本：先运行 `prepare-pagefind.mjs` 清理双语重复（lang-zh 加 `data-pagefind-ignore`），再跑 `pagefind --site dist`
  - 索引：全站 118 页、14560 词
  - 搜索入口：全站顶部 Header 均可见（`⌘K` 快捷键支持）
  - 弹窗式 UI，尺寸自适应

**已完成（Phase 1）：**
- ✅ 全站搜索入口（Header 右上角搜索图标，全页面可见）
- ✅ 搜索范围：Digest / SNEK Daily / Builder's Log / AI Timeline + 全站 Posts
- ✅ 搜索结果彩色 Section 标签（Digest 紫 / Builder's Log 蓝 / SNEK Daily 绿 / AI Timeline 琥珀 / Posts 灰）
- ✅ 语言文案同步：切换 EN/中文 后搜索 placeholder 自动切换
- ✅ 中文双语去重：索引只收录英文层，避免同内容双重命中
- ✅ 搜索 UI 与站点风格统一（serif 字体 / 品牌紫 / 极简留白）

**排序逻辑：**
- 当前：Pagefind 默认相关度优先（BM25，关键词在标题命中 > 正文命中）
- Section 标签让用户扫一眼就知道来源，弥补"结果混排"体验

**待优化（Phase 2）：**
- [ ] AI Timeline 内容摘要优化（company/category 字段更好暴露）
- [ ] 搜索排序：按日期倒序选项（需添加 `data-pagefind-sort`）
- [ ] 分 Section 展示（Lab 内容优先于 Posts）

---

## 核心用户流程

### 流程一：新访客
```
Twitter/Telegram 链接 → 首页 → 浏览 Daily Digest → 订阅 RSS → 成为定期读者
```

### 流程二：日常读者
```
RSS/书签 → Daily Digest 列表 → 读今日精选 → 看行动指南 → 执行
```

### 流程三：Builder 粉丝
```
首页 → Builder's Log → 看今天 Agent 干了什么 → Projects → 了解具体项目
```

---

## 优先级分层（2026-03-09 重排）

### Now（现在最该做）
- [ ] **Digest 专属 RSS**（把展示页变成可订阅产品）
- [ ] **SNEK Daily 独立 RSS**
- [ ] **Digest 库存积累**（≥5 篇/周频率）

### Next（接下来一周）
- [ ] AI Timeline 搜索友好度优化（摘要 / company / category 暴露更完整）
- [ ] 搜索 Phase 2：按日期排序选项
- [ ] Builder's Log 内容继续稳定输出

### Later（后续迭代）
- [ ] Weekly Thesis（从灵感池升级为正式栏目）
- [ ] 邮件订阅（Buttondown / Resend / Listmonk）
- [ ] 阅读统计（Plausible / Umami）
- [ ] Agent Activity Feed（像素办公室）
- [ ] Portfolio Tracker 公开版

---

## 边界条件

| 场景 | 处理方式 |
|------|---------|
| Rex 某天没选文 | 当天不发 Daily Digest，不影响网站运行 |
| 原文被删/链接失效 | 保留翻译全文，标注"原文已不可用" |
| Builder's Log 某天无产出 | 不生成当日条目，时间线自然跳过 |
| 中英文翻译质量差 | Rex 审核环节把关，不通过就不发 |
| 流量突增 | 静态站 + CDN，无需担心 |

---

## 成功指标 KPI

| 指标 | 目标（3 个月内） | 衡量方式 |
|------|----------------|---------|
| 日均访客 | 100 UV | Plausible/Umami |
| RSS 订阅数 | 200 | RSS 统计 |
| Daily Digest 发布频率 | ≥5 篇/周 | 内容计数 |
| Rex 每日投入时间 | ≤15 分钟 | 自评 |
| Twitter 引流效果 | 每篇文章 ≥10 次点击 | UTM 追踪 |

---

## 当前项目结构（2026-03-09 实际）

```
projects/rexliu-website/
├── src/
│   ├── content/
│   │   ├── ai-timeline/
│   │   ├── builder-log/
│   │   ├── digest/
│   │   ├── projects/
│   │   └── snek-daily/
│   ├── pages/
│   │   ├── lab/
│   │   │   ├── index.astro
│   │   │   ├── ai-timeline/index.astro
│   │   │   ├── digest/[...id].astro
│   │   │   ├── builder-log/[...id].astro
│   │   │   ├── snek-daily/[...id].astro
│   │   │   └── agents/index.astro
│   │   └── rss.xml.ts
│   ├── components/
│   │   ├── LanguageToggle.astro
│   │   └── Search.astro
│   ├── i18n/
│   └── plugins/
│       └── remark-bilingual.ts
└── package.json
```

**说明：**
- 当前已经不是独立 `rexs-lab/` 仓库，而是 `rexliu-website` 里的一个内容分区
- 搜索相关依赖已具备，但 UI 还没真正接进 Lab 用户路径

---

## 进度追踪（2026-03-09 更新）

### 已完成
- [x] 首页（Hero + 最新内容 + Projects）— 已在 `rexliu.io/lab/`
- [x] Daily Digest 列表页 + 详情页 — 已上线
- [x] Builder's Log 页面 — 已上线
- [x] Projects 卡片页 — 已上线
- [x] AI Timeline 时间线页面 — 已上线
- [x] AI Timeline 公司筛选 + 类别筛选 — 已上线
- [x] 全站 RSS — 已存在
- [x] 响应式设计 — 已完成
- [x] Git 推送自动部署 — 已完成

### 进行中
- [ ] Language Toggle 完整接入 Lab 用户流
- [ ] 单文件双语体验打磨（UI 文案、fallback、局部显隐）
- [ ] Digest / SNEK Daily / Builder's Log 内容库存继续积累

### 已完成（2026-03-09 新增）
- [x] **全站搜索接入（Pagefind）** — 搜索入口全页可见，⌘K 快捷键支持
- [x] **搜索结果 Section 标签** — Digest/Builder's Log/SNEK/AI Timeline 颜色区分
- [x] **搜索 UI 与站点风格统一** — serif / 极简 / 品牌紫
- [x] **双语去重** — 索引只收英文层，避免重复命中
- [x] **语言文案同步** — 切换 EN/中文 搜索提示自动跟随

### 待做
- [ ] `/rss-digest.xml`
- [ ] `/rss-snek-daily.xml`
- [ ] Weekly Thesis 从想法升级为正式栏目

### 自动化状态
| 板块 | 自动更新 | cron | 频率 |
|------|---------|------|------|
| AI Timeline | ✅ | timeline-auto-update-morning/evening | 2x/天 |
| Digest | ✅ | digest-recommend | 1x/天 |
| SNEK Daily | ✅ | snek-daily-briefing | 1x/天 |
| Builder's Log | ✅ | compound-nightly-review | 1x/天 |
| Projects | ❌ 手动 | — | 低频 |

### 内容库存（2026-03-09 实际）
| 板块 | 当前数量 | 备注 |
|------|---------|------|
| AI Timeline | 204 条 | 已具备时间线产品雏形 |
| Digest | 6 篇 | 已脱离“只有 1 篇”的冷启动状态 |
| SNEK Daily | 5 篇 | 正在积累日更感 |
| Builder's Log | 8 篇 | 已能形成连续建造轨迹 |
| Projects | 8 个 | 足够支撑首页展示 |

### 下一阶段待办（按 ROI）
1. **PRD 对齐现实** — 避免继续按旧文档做决策
2. **Digest RSS** — 先把订阅入口补齐
3. **Lab 搜索** — 让内容真正可找
4. **SNEK Daily RSS** — 完成 Daily 系列订阅闭环
5. **Weekly Thesis** — 提升 Rex's Lab 的“招牌菜”属性

---

## 灵感池（Future Ideas）

### 🔥 高价值（与 Rex 目标直接相关）

**1. Weekly Thesis（周度观点）**
每周一篇 Rex 视角的市场/AI 深度观点，从当周 Digest + Timeline + SNEK Daily 中提炼。相当于「Rex 的周报」对外版。跟 50k follower 目标直接挂钩——这是 Twitter 引流回网站的最强内容。

**2. Portfolio Tracker 公开版**
Build in Public 的投资版。参考 @raaborern 的公开持仓页。

- **展示**: 资产类别占比饼图/条形图（稳定币/债券固收/权益/加密…）+ 每类下具体标的名称 + 各标的占比
- **隐藏**: 绝对金额、收益率/盈亏、收益曲线（月度曲线可反推绝对值，不做）
- **技术**: 定时任务从 portfolio.json 生成脱敏 JSON（只留 name + percentage），commit 进 repo，Astro 构建时读 JSON 渲染静态页
- **更新频率**: 每天或每周一次
- **状态**: Rex 尚未决定是否公开，方案先留着 [2026-03-06]

**3. AI Timeline 互动模式**
- 公司维度筛选（Google / OpenAI / Anthropic...）
- 「对比模式」：选两家公司，并排看时间线（比如 OpenAI vs Anthropic）
- 事件关联：点一个事件，高亮相关事件（如 DeepSeek R1 → DeepSeek $1T 抛售）

**4. Digest → Newsletter**
Digest 页面加 email 订阅入口（用 Buttondown 或 Listmonk），每日自动发送。从网站读者转化为 newsletter 订阅者，建立真正的分发渠道。

### 💡 中等价值（差异化体验）

**5. Agent Activity Feed（像素办公室）**
实时展示 AI 团队在做什么。让访客感受到「这个网站背后有一个 AI 团队在 24 小时运转」。

- **视觉**: 像素风办公室场景，6 个 Agent 角色（Samantha/Loki/Vision/Jarvis/Shuri/Friday），CSS sprite sheet animation，idle/working/error 状态映射到不同区域（沙发/办公桌/Bug 区），气泡显示当前任务
- **数据源**: Convex 实时数据库（已有）。`ping-agent.mjs` 已在写入 Agent 状态，与 Discord #ops 同一条管线，零延迟
- **技术**: Astro 页面 + client-side Convex SDK subscription，状态变化自动更新，不需要轮询或 rebuild
- **美术**: 需要 6 个 Agent 的 sprite sheet（Shuri 设计）。参考 [Star-Office-UI](https://github.com/ringhyacinth/Star-Office-UI)（非商业学习授权，正式用需自己画）
- **已知局限**: 当前只有一个 Anthropic 账户，多 Agent 难以同时在线。后续接入不同模型/provider 后效果会更好
- **实现步骤**: ① 静态原型（占位符角色 + 动画跑通） ② Shuri 画 sprite sheet ③ 接 Convex 实时数据
- **状态**: 方案确认，待排期 [2026-03-06]

**6. Reading Stack（阅读堆栈）**
展示 Rex 当前在读什么——从 daily-reading cron 自动生成。每本书/课程一个卡片，进度条，读完的标注。跟 Builder's Log 呼应。

**7. Signal Dashboard（信号看板）**
Alpha Radar 的公开版——不暴露具体操作建议，但展示「Rex 在关注什么」：热度信号、叙事雷达、关注项目列表。对 Crypto 受众有吸引力。

**8. 推文归档（Tweet Archive）**
把 twitter-brain/corpus 的 6118 条原创推文做成可搜索的归档页。按主题/时间/互动量排序。很少有人做这个，但对深度粉丝极有价值。

### 🌱 探索性（长期方向）

**9. Rex's Takes（快评）**
介于推文和文章之间的短内容——200-500 字的快速观点，不需要完整文章的深度。类似 Substack Notes 但在自己的网站上。可以从 Flomo 笔记中筛选发布。

**10. 多语言搜索**
全站搜索（Pagefind 或 Fuse.js），支持中英文混合搜索。当内容积累到 200+ 篇时变得必要。

**11. 互动图谱**
把 AI Timeline 的公司/事件/人物关系做成知识图谱可视化。很炫但开发成本高，等内容密度够了再考虑。
