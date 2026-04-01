# Visual Thinking v2 Design

**Project**: `rexliu.io /lab/visual`
**Owner**: Rex Liu
**Prepared for**: Jarvis
**Date**: 2026-04-01

---

## CEO Review

**Job to be Done**: 把 `Visual Thinking` 从 4 个数学实验扩展为更完整的「Rex 看世界的数学语法」页面，继续呈现数学之美、艺术之美，以及这些抽象规律如何映射到投资、人生与认知。

**10-Star Version**: 访客进入页面后，不是看到几个 demo，而是看到一组有统一美学、统一交互节奏、统一双语文案的数学母题。每个实验都既能独立成立，也能和 Rex 的 worldview 自然互文。桌面端像一个互动展览，移动端依然顺滑、清晰、可玩。

**天花板**: 中高 — 不是高频功能页，但它非常适合成为 `Lab` 的标志性页面，也有很强的分享价值。

**ROI**: 值得 — 实现难度中等，但可长期沉淀为网站代表作，且能持续承载 Rex 的 worldview。

**受众持续性**: 持续 — 新访客会被吸引，老访客也会因为新模块回访。

**Build vs Buy**: Build — 这是强个人表达页面，没有现成产品可买，买来的只会丢掉 Rex 的气质。

**最小验证**: 先补 3 个新实验，不重做整体框架，验证页面扩展后是否仍统一、流畅、有记忆点。

**结论**: 做。保持现有页面骨架与气质，只新增 3 个同等级别实验。

---

## 现状理解（必须保留的 DNA）

当前页面 `/lab/visual/` 已有 4 个实验：
1. 正弦波工作室
2. 神经脉冲
3. 复利增长
4. 贝塞尔旅程

它的核心不是工具，不是 dashboard，不是知识卡片，而是：

> **数学母题 + 交互图形 + Rex 世界观映射**

### 当前页面已经成立的特征
- 深浅主题都成立
- 每个模块结构统一：编号 / 标题 / slogan / canvas / controls / formula / explain / quote
- 数学与人生、投资、认知之间有自然映射
- 文案语气有哲思感，但不过度装饰
- 页面整体像一个小型互动展览

### v2 原则
- **不要重做现有 4 个模块**
- **只新增 3 个模块**，并且结构和现有一致
- **不是做功能扩展，是做思想扩展**
- **所有新增模块必须同时满足：数学上成立 + 可视化上好看 + 与 Rex worldview 有连接**

---

## 新增模块（v2）

### 05. 大数定律

**中文标题**：大数定律  
**英文标题**：Law of Large Numbers  
**Slogan (ZH)**：短期看运气，长期看分布。  
**Slogan (EN)**：In the short run, luck. In the long run, distribution.

#### 交互目标
让用户直观看到：
- 少样本时，结果剧烈波动
- 样本数上来后，均值逐渐收敛
- 长期主义不是鸡汤，而是统计事实

#### 可视化建议
**主视觉**：
- 一条“真实概率”水平参考线
- 一条“样本均值”动态收敛线
- 背后可有轻量散点/柱状结果闪动，体现噪音

**交互控件**：
- `样本数 n`：10 → 1000
- `胜率 p`：0.1 → 0.9
- `波动 σ`：low / medium / high

**动态感**：
- 初始阶段抖动明显
- n 上升后曲线缓慢收敛到目标值
- 保持优雅，不要搞成量化软件 UI

#### 数学表达
建议显示：
```text
X̄ₙ → μ  (n → ∞)

X̄ₙ = 样本均值 sample mean
μ = 真实均值 true mean
```

#### 解释文案
**ZH**：
单次结果几乎说明不了什么。十次实验，波动像命运；一千次实验，结构开始浮现。大数定律提醒我们：世界不是立刻奖励正确，而是在足够多次重复后显露规律。投资如此，写作如此，关系经营也是如此。短期里你会怀疑自己，长期里分布会替你说话。

**EN**：
A single outcome proves almost nothing. In ten trials, fluctuation feels like fate; in a thousand, structure begins to emerge. The law of large numbers reminds us that the world does not reward correctness immediately — it reveals patterns only after enough repetition. Investing, writing, relationships: all of them bow to distribution in the end.

#### Quote
**ZH**：
「一次输赢不说明你对了还是错了。重复足够多次，优势才会显形。」— Rex Liu

**EN**：
"One win or loss tells you almost nothing. Edge only reveals itself through repetition." — Rex Liu

---

### 06. 分形 / 自相似

**中文标题**：分形回声  
**英文标题**：Fractal Echo  
**Slogan (ZH)**：局部里藏着整体。  
**Slogan (EN)**：The whole hides inside the part.

#### 交互目标
让用户感受到：
- 复杂不等于混乱
- 不同尺度上会重复同一种结构
- 人生/市场里的很多“新问题”，本质只是旧模式的放大

#### 可视化建议
**主视觉候选（二选一）**：
1. **分形树**（更温和、诗意、网站友好）
2. **Mandelbrot / Julia-like**（更数学硬核，但实现复杂）

**建议先做分形树**，原因：
- 与现有页面气质更一致
- 更容易在暗色/亮色都好看
- 更适合做动画与交互

**交互控件**：
- `迭代层数 depth`：3 → 9
- `分支角度 angle`：10° → 50°
- `缩放比例 scale`：0.55 → 0.8
- `扰动 jitter`：0 → 1

**动态感**：
- 随参数变化，树会长出不同层级结构
- 可轻微摆动，但不要像 screensaver

#### 数学表达
建议显示：
```text
Self-similarity across scale

N = r^(-D)
D = fractal dimension
```

#### 解释文案
**ZH**：
很多复杂系统并不是杂乱无章，而是在不同尺度重复同一种模式。市场像这样，人的习惯像这样，人生的困境也常常像这样。你以为自己换了一个新问题，放大看，往往只是旧结构的再现。分形之美，不在复杂，而在复杂背后那种令人惊讶的熟悉感。

**EN**：
Many complex systems are not chaotic at all — they repeat the same structure across scales. Markets do this. Habits do this. Even life’s recurring dilemmas do this. What feels like a new problem is often just an old pattern enlarged. The beauty of fractals lies not in complexity itself, but in the strange familiarity hidden inside it.

#### Quote
**ZH**：
「你看到的是新问题，还是旧模式的放大版？」— Rex Liu

**EN**：
"Are you facing a new problem — or just an enlarged version of an old pattern?" — Rex Liu

---

### 07. 傅里叶分解

**中文标题**：傅里叶分解  
**英文标题**：Fourier Decomposition  
**Slogan (ZH)**：复杂，往往只是多个简单模式的叠加。  
**Slogan (EN)**：Complexity is often the sum of simple patterns.

#### 交互目标
让用户看到：
- 复杂波形不是魔法，是多条简单波叠加
- 世界表面上的混乱，可能可被拆解
- 这和信息、市场、情绪、人生结构都有共振

#### 可视化建议
**主视觉**：上下双区
- 上：最终合成波形（主角）
- 下：各个基础正弦波逐条叠加

或中间采用 overlay：
- 彩色细线 = component waves
- 粗亮主线 = final signal

**交互控件**：
- `基频 base`：1 → 5
- `谐波数量 harmonics`：1 → 7
- `衰减 decay`：0.2 → 1.0
- `显示分量 show components`：on/off

**动态感**：
- 滑块变化时，component waves 平滑过渡
- final signal 始终保持为视觉中心

#### 数学表达
建议显示：
```text
f(x) = Σ [aₙ sin(nx) + bₙ cos(nx)]

复杂信号 = 多个简单波形的叠加
```

#### 解释文案
**ZH**：
表面上的复杂，很多时候只是多个简单规律同时发生。噪音、周期、趋势、情绪，叠在一起，就像市场；冲动、习惯、环境、目标，叠在一起，就像人生。傅里叶分解的美，在于它提醒我们：复杂不一定不可理解，只要你愿意拆开看。

**EN**：
What appears complex is often just many simple rules happening at once. Noise, cycles, trends, emotion — layered together, they become the market. Impulse, habit, environment, purpose — layered together, they become a life. The beauty of Fourier decomposition is this: complexity is not beyond understanding, if you are willing to break it apart.

#### Quote
**ZH**：
「复杂不是无法理解，只是你还没拆开它。」— Rex Liu

**EN**：
"Complexity is not beyond understanding. You just haven’t broken it apart yet." — Rex Liu

---

## 内容与视觉统一要求

### 1. 结构必须与现有 4 个模块一致
每个新增模块保持：
- `exp-num`
- `exp-title`
- `exp-subtitle`
- canvas / SVG / simulation
- controls
- formula
- explain
- quote

不要发明第 5 套结构。

### 2. 中英文必须同等级，不是附属翻译
- 现有页面已经有 `lang-en` / `lang-zh`
- 新模块必须完整中英双语
- 英文不是机翻，要保持网站既有语气：简洁、有判断、有一点诗意，但不装腔

### 3. 明暗主题都要成立
参考当前组件里的：
- `getCanvasBg()`
- `getGridColor()`
- `useThemeColors()`

新增模块不能写死浅色世界。

### 4. 颜色与气质保持现有系统
- 主品牌色仍是 `PURPLE = #8953d1`
- 但不要所有模块都只是“紫色换个图”
- 每个实验可以有自己的色彩倾向，但要与现有 4 个统一在一个家族里

### 5. 交互必须是“理解增强”，不是“控件堆砌”
滑块数量控制在 3-4 个。
每个控件都必须回答一个问题：
> 用户拖这个，理解会更深吗？

如果不会，就不要加。

---

## 技术建议（给 Jarvis）

### 实现原则
- 继续用现有 `VisualExperiments.tsx`
- 不拆成新页面
- 新增 3 个 experiment component
- 优先使用 Canvas 2D（与现有风格统一）
- 如某个模块用 SVG 更合适，也可以局部混用，但不要把页面做成技术拼盘

### 推荐拆分
如果文件太长，可以在 v2 过程中顺手轻量拆分：
- `SineWaveStudio`
- `NeuralPulse`
- `CompoundGrowth`
- `BezierJourney`
- `LawOfLargeNumbers`
- `FractalEcho`
- `FourierDecomposition`

但注意：
- **不要为了拆文件而拆**
- 页面稳定优先
- 如果拆，API / prop 风格保持一致

### 性能要求
- 移动端不卡
- 关闭标签页时动画清理干净
- ResizeObserver 逻辑沿用现有模式
- 不要引入重型图形依赖库，除非真的必要

---

## 排序建议
新增后页面顺序：
1. 正弦波工作室
2. 神经脉冲
3. 复利增长
4. 贝塞尔旅程
5. 大数定律
6. 分形回声
7. 傅里叶分解

这个顺序从：
**周期 → 连接 → 时间 → 路径 → 概率 → 结构 → 复杂拆解**
是通顺的。

---

## 验收标准

Jarvis 交付前必须验证：

### 内容
- 3 个新模块都补齐中英文标题 / slogan / explain / quote
- 文案风格与现有 4 个模块一致，不像新页面嫁接过来的

### 视觉
- 明暗主题截图都看一遍
- 页面滚动节奏仍然舒服，不因为新增 3 块变成无聊长页
- 每个 canvas 在 Retina 下清晰

### 交互
- 滑块拖动时无明显掉帧
- 手机端控件可用，不挤爆
- 实验逻辑直觉成立，拖动参数有“啊哈”感

### 最后一句
这不是“给网站多加三个实验”，而是把 `Visual Thinking` 从 4 个点，扩成一整套更完整的 Rex 数学世界观。
