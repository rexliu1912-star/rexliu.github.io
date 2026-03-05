---
title: Rex's Lab 独立网站 — PRD
status: pending
created: 2026-03-05
mrd: output/mrd-rexs-lab-website.md
author: Rex + Samantha
---

# PRD — Rex's Lab Website (lab.rexliu.io)

## 技术选型
- **框架**: Astro（Content Collections + i18n）
- **样式**: Tailwind CSS
- **设计系统**: 复用 `design-system/tokens.json`（品牌紫 #8953d1、暗色 #151515、Inter 字体）
- **部署**: Cloudflare Pages（或 Vercel）
- **域名**: lab.rexliu.io（CNAME 到部署平台）
- **内容格式**: Markdown + frontmatter，中英双语各一个文件夹
- **仓库**: `rexliu1912-star/rexs-lab`（新建）

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

### F5: 语言切换（i18n）
- 全站中英双语
- URL 结构：`lab.rexliu.io/zh/...` / `lab.rexliu.io/en/...`
- 默认语言：英文（匹配 Twitter 受众）
- 右上角语言切换按钮
- Daily Digest 中英文章互链

### F6: RSS 输出
- `/rss.xml`（全部内容）
- `/rss-digest.xml`（仅 Daily Digest）
- 支持中英文分别订阅

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

## 优先级分层

### Must（MVP 必须有）
- [ ] 首页（Hero + 最新内容 + Projects）
- [ ] Daily Digest 列表页 + 详情页（中英双语）
- [ ] 语言切换
- [ ] RSS 输出
- [ ] 响应式设计（移动端适配）
- [ ] lab.rexliu.io 域名配置
- [ ] Git 推送自动部署

### Should（上线后一周内）
- [ ] Builder's Log 页面
- [ ] Projects 卡片页
- [ ] AI Timeline 时间线页面
- [ ] 标签筛选

### Could（后续迭代）
- [ ] Voice 版本（TTS 音频播放器）
- [ ] 邮件订阅（Buttondown / Resend）
- [ ] 搜索功能
- [ ] 阅读统计（Plausible / Umami）
- [ ] 付费墙 / 会员系统

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

## 项目结构（Astro）

```
rexs-lab/
├── astro.config.mjs
├── tailwind.config.mjs
├── src/
│   ├── content/
│   │   ├── digest/
│   │   │   ├── zh/          # 中文文章
│   │   │   └── en/          # 英文文章
│   │   ├── log/             # Builder's Log
│   │   ├── timeline/        # AI Timeline 事件
│   │   └── projects/        # 项目展示
│   ├── pages/
│   │   ├── zh/
│   │   │   ├── index.astro
│   │   │   └── digest/[...slug].astro
│   │   ├── en/
│   │   │   ├── index.astro
│   │   │   └── digest/[...slug].astro
│   │   ├── log.astro
│   │   ├── projects.astro
│   │   └── rss.xml.js
│   ├── components/
│   │   ├── Header.astro      # 导航 + 语言切换
│   │   ├── DigestCard.astro
│   │   ├── LogEntry.astro
│   │   ├── ProjectCard.astro
│   │   └── ActionGuide.astro # 行动指南高亮块
│   ├── layouts/
│   │   └── Base.astro
│   └── styles/
│       └── global.css        # tokens.json → CSS variables
├── public/
│   └── favicon.svg
└── package.json
```

---

## 进度追踪（2026-03-05 更新）

### Must（MVP）
- [x] 首页（Hero + 最新内容 + Projects）— 合并进 rexliu.io/lab/
- [x] Daily Digest 列表页 + 详情页 — ✅ 上线，中英双语（英文正文 + 中文完整翻译）
- [ ] ~~语言切换~~ — **架构调整**：不做独立 i18n 路由，改为单页内中英双语（已实现）
- [x] RSS 输出 — rexliu.io 已有全站 RSS
- [x] 响应式设计 — ✅
- [x] ~~lab.rexliu.io 域名~~ — **决策变更**：合并进 rexliu.io/lab/（非独立站）
- [x] Git 推送自动部署 — GitHub Actions → GitHub Pages

### Should（上线后一周内）
- [x] Builder's Log 页面 — ✅ 5 篇种子 + nightly review 自动生成
- [x] Projects 卡片页 — ✅ 6 个项目
- [x] AI Timeline 时间线页面 — ✅ 101 条，18 家公司，按类别筛选
- [x] 标签筛选 — ✅ AI Timeline 支持 7 类筛选

### Could（后续迭代）
- [ ] Digest 专属 RSS（/rss-digest.xml）
- [ ] 搜索功能
- [ ] AI Timeline 公司筛选（目前只有类别筛选）
- [ ] SNEK Daily 独立 RSS

### 自动化状态
| 板块 | 自动更新 | cron | 频率 |
|------|---------|------|------|
| AI Timeline | ✅ | timeline-auto-update-morning/evening | 2x/天 09:15 + 21:15 |
| Digest | ✅ | digest-recommend | 1x/天 08:45 |
| SNEK Daily | ✅ | snek-daily-briefing | 1x/天 09:00 |
| Builder's Log | ✅ | compound-nightly-review | 1x/天 23:00 |
| Projects | ❌ 手动 | — | 低频，按需更新 |

### 内容库存
| 板块 | 当前数量 | 目标 |
|------|---------|------|
| AI Timeline | 101 条 | 持续积累 |
| Digest | 1 篇 | ≥5 篇/周 |
| SNEK Daily | 1 篇 | 1 篇/天 |
| Builder's Log | 5 篇 | 1 篇/天（自动） |
| Projects | 6 个 | 按需 |

### 待办（按优先级）
1. **Digest 库存积累** — 目前只有 1 篇，需要连续跑几天 cron 积累内容
2. **AI Timeline 公司筛选** — 目前只有类别筛选，加公司维度
3. **Digest RSS** — 独立 feed 方便订阅
4. **配色微调** — 浅色模式对比度已提升，观察用户反馈再调
5. **SNEK Daily 库存** — 同 Digest，需要连续跑积累

---

## 灵感池（Future Ideas）

### 🔥 高价值（与 Rex 目标直接相关）

**1. Weekly Thesis（周度观点）**
每周一篇 Rex 视角的市场/AI 深度观点，从当周 Digest + Timeline + SNEK Daily 中提炼。相当于「Rex 的周报」对外版。跟 50k follower 目标直接挂钩——这是 Twitter 引流回网站的最强内容。

**2. Portfolio Tracker 公开版**
把 Finance 页面的一个子集做成公开可见的投资组合展示（配置比例 + 月度收益曲线），不暴露具体金额。Build in Public 的投资版。参考 @raaborern 的公开持仓页。

**3. AI Timeline 互动模式**
- 公司维度筛选（Google / OpenAI / Anthropic...）
- 「对比模式」：选两家公司，并排看时间线（比如 OpenAI vs Anthropic）
- 事件关联：点一个事件，高亮相关事件（如 DeepSeek R1 → DeepSeek $1T 抛售）

**4. Digest → Newsletter**
Digest 页面加 email 订阅入口（用 Buttondown 或 Listmonk），每日自动发送。从网站读者转化为 newsletter 订阅者，建立真正的分发渠道。

### 💡 中等价值（差异化体验）

**5. Agent Activity Feed**
实时展示 AI 团队在做什么——类似 GitHub activity feed，但是 Samantha/Loki/Vision/Jarvis 的工作流。让访客感受到「这个网站背后有一个 AI 团队在 24 小时运转」。数据源已有（sync.md + cron runs）。

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
