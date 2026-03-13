# Library Page v2 — 开发文档

> Owner: Jarvis ⚙️ | Designer: Shuri 🎨 | Priority: High
> 目标：从"能用的书单"升级到"值得逛的个人图书馆"

---

## 一、现状问题

### 数据缺失（最大瓶颈）

| 数据项 | 现有 | 缺失 | 覆盖率 |
|--------|------|------|--------|
| 书封面 | 6 | **79** | 7% |
| 书评分 | 47 | 38 | 55% |
| 书笔记 | 14 | 71 | 16% |
| 书作者 | 69 | **16 (Unknown)** | 81% |
| 影视年份 | 40 | **23** | 63% |
| 影视笔记 | 8 | 55 | 13% |

### UI/UX 问题
- 纯静态网格，无动画，无交互质感
- 没封面的书全是同一个紫色渐变块，看着单调
- 笔记展开是 inline 展开（挤开布局），体验差
- Tab 切换硬切，无过渡
- 没有统计概览（多少本书、多少有笔记等）

---

## 二、封面获取方案

### Phase 1: API 批量获取
优先级从高到低尝试：

1. **Google Books API**（中文书覆盖最好）
   - `https://www.googleapis.com/books/v1/volumes?q={title}+{author}`
   - 取 `volumeInfo.imageLinks.thumbnail`
   - 需要 proxy（127.0.0.1:7890）
   
2. **Open Library API**（英文/国际书好）
   - `https://openlibrary.org/search.json?title={title}&limit=1`
   - 封面：`https://covers.openlibrary.org/b/id/{cover_i}-L.jpg`
   - 中文书名搜不到，需用英文标题

3. **豆瓣爬取**（最后手段，覆盖率最高）
   - 搜索页 `https://book.douban.com/subject_search?search_text={title}`
   - 需要处理反爬

### Phase 2: 本地存储
- 获取的封面下载到 `public/covers/books/` 和 `public/covers/media/`
- 文件名：`{slug}.jpg`（从标题生成 slug）
- `books.json` / `media.json` 的 `cover` 字段改为本地路径 `/covers/books/{slug}.jpg`
- 避免外链失效和加载慢

### Phase 3: 手动兜底
- API 都找不到的，用 AI 生成风格化占位封面（Nano Banana）
- 统一风格：书名 + 作者 + 类别色系背景

### 影视封面
- **TMDB API**（免费，中文支持好）：`https://api.themoviedb.org/3/search/movie?query={title}&language=zh-CN`
- 海报：`https://image.tmdb.org/t/p/w500/{poster_path}`
- 需要 API Key（免费注册）

---

## 三、数据补全

### 3.1 Unknown Author 修复（16 本）
脚本遍历 `books.json`，对 author 为空或 "Unknown author" 的条目：
1. Google Books API 查标题 → 取 authors 字段
2. 失败则 Open Library → 取 author_name
3. 仍失败标记为 `needs_manual: true`

### 3.2 缺失评分（38 本）
- 不自动填，评分只能来自 Rex
- 在页面上显示"未评分"而不是什么都不显示
- 后续可加一个"快速评分"功能（点星星）

### 3.3 缺失年份（影视 23 部）
- TMDB API 查 `release_date` / `first_air_date`
- 批量补全

---

## 四、UI/UX 升级

### 4.1 3D 书卡悬停（Tilt Effect）
```
hover 时卡片跟随鼠标方向倾斜
CSS: perspective(800px) rotateX(Ydeg) rotateY(Xdeg)
JS: mousemove 事件计算倾斜角度
离开时 smooth transition 回正
加微弱阴影随倾斜方向变化
```

### 4.2 滚动入场动画（Staggered Reveal）
```
IntersectionObserver 监听每张卡片
进入视口时: opacity 0→1, translateY 20px→0
每张卡片延迟 30-50ms 错开（stagger）
只触发一次（不重复）
```

### 4.3 Tab 切换过渡
```
切换时当前内容 fade-out (opacity 1→0, 150ms)
新内容 fade-in (opacity 0→1, 150ms)
可选: 加 translateX 滑动方向感
使用 View Transitions API（支持的浏览器）降级为 CSS transition
```

### 4.4 笔记展开 → 毛玻璃 Modal
```
点击 📝 Notes → 弹出居中 modal
背景: backdrop-filter: blur(12px) + 半透明黑
Modal 内容: 书名、作者、评分、完整笔记
进入动画: scale(0.95)→(1) + opacity 0→1, 200ms
退出: 反向 + ESC/点击背景关闭
移动端: modal 变底部 sheet（从下滑入）
```

### 4.5 封面渐变分类色系
没有封面的书，按 tag 用不同色系：
```
投资: #8953d1 → #6b3fa0 (紫，保持品牌色)
成长: #3b82f6 → #1d4ed8 (蓝)
文化: #f59e0b → #d97706 (琥珀)
文学: #ec4899 → #be185d (粉)
古琴: #10b981 → #047857 (绿)
写作: #6366f1 → #4338ca (靛蓝)
```

影视同理按类型分色：
```
剧情: #8953d1 (紫)
动画: #f59e0b (琥珀)
历史: #ef4444 (红)
科幻: #3b82f6 (蓝)
喜剧: #10b981 (绿)
纪实: #6b7280 (灰)
```

### 4.6 顶部统计条（Count-up）
```
页面加载时数字从 0 滚动到实际值
"85 books · 14 with notes · 63 films & shows"
用 CSS counter 或 requestAnimationFrame
耗时 ~1s，easeOut 缓动
```

### 4.7 书架视图（可选，Phase 2）
- Toggle 按钮：📚 Grid / 📖 Shelf
- Shelf 模式：书脊竖排，显示书名+色条
- hover 时"抽出"效果（translateZ + 放大）
- 参考：https://library.obys.agency/

---

## 五、技术方案

### 框架约束
- Astro 静态站，不引入 React/Vue
- 动画用纯 CSS + vanilla JS（`<script is:inline>`）
- 可引入轻量库：
  - `vanilla-tilt.js`（3D 倾斜，2KB）— 或手写
  - 不引入 GSAP/Framer Motion（太重）

### 文件结构
```
src/pages/lab/library/
  index.astro          ← 主页面（已有）
src/data/
  books.json           ← 书数据（已有）
  media.json           ← 影视数据（已有）
public/covers/
  books/               ← 书封面（新建）
  media/               ← 影视海报（新建）
scripts/
  fetch-book-covers.py ← 封面批量获取脚本（新建）
  fetch-media-covers.py← 影视海报获取脚本（新建）
  fix-unknown-authors.py← 作者修复脚本（新建）
```

### 性能要求
- 封面图片: lazy loading (`loading="lazy"`)
- 封面尺寸: 书 300×450px, 影视 300×170px（不超过 50KB/张）
- 首屏加载: 不因动画阻塞渲染
- IntersectionObserver: 只观察可视区域 ±200px

---

## 六、执行分工

| Phase | 任务 | 负责 | 预估 |
|-------|------|------|------|
| **1** | 封面获取脚本 + 批量跑 | Jarvis | 1 session |
| **1** | Unknown author 修复 | Jarvis | 同上合并 |
| **1** | 影视年份补全 | Jarvis | 同上合并 |
| **2** | 3D tilt + 滚动入场 + Tab 过渡 | Jarvis | 1 session |
| **2** | 笔记 Modal + 分类色系 | Jarvis | 同上合并 |
| **2** | 统计条 count-up | Jarvis | 同上合并 |
| **3** | 书架视图（可选） | Jarvis | 1 session |
| **3** | AI 生成兜底封面 | Shuri | 按需 |

### 交付标准
- [ ] 封面覆盖率 ≥ 70%（书 60+/85，影视 45+/63）
- [ ] Unknown author = 0
- [ ] 所有影视有年份
- [ ] 3D tilt + 滚动动画 + Tab 过渡 + Modal 笔记展开
- [ ] 分类色系渐变
- [ ] 统计条 count-up
- [ ] Lighthouse Performance ≥ 90
- [ ] 移动端适配正常

---

## 七、参考
- https://library.obys.agency/ — 书架式交互，纸张质感
- https://rexliu.io 现有设计语言（品牌紫 #8953d1，font-serif，glow-card）
- Codrops: https://tympanus.net/codrops/2026/01/12/obys-design-books-turning-a-reading-list-into-a-tactile-web-library/
