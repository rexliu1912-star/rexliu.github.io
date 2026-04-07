# Travel Data 编辑指南 / Editing Guide

> 这份文档帮助你直接在 GitHub 上编辑 `travel.json`，无需懂代码。

---

## 1. 快速上手

1. 打开 GitHub 仓库 → `public/data/travel.json`
2. 点击右上角 ✏️ 铅笔图标进入编辑模式
3. 修改内容（参照下方字段说明）
4. 填写 commit message（如 "add Xi'an city"），点击 **Commit changes**
5. 保存后 Vercel 自动部署，约 1-2 分钟生效

⚠️ JSON 格式要求严格：
- 字符串用双引号 `""`
- 最后一个元素后**不加逗号**
- 数字和 `null`、`true`、`false` 不加引号
- 可用 [jsonlint.com](https://jsonlint.com) 验证格式

---

## 2. meta 字段

```json
{
  "meta": {
    "title": "The Journey",        // 英文标题
    "titleCN": "旅途",              // 中文标题
    "subtitle": "Digital nomad since Nov 2025",  // 英文副标题
    "subtitleCN": "2025年11月起，数字游牧",       // 中文副标题
    "startDate": "2025-11-18",     // 旅程起始日期 (YYYY-MM-DD)
    "currentCity": "chengdu"       // 当前所在城市的 id（必须匹配 cities 中某个 id）
  }
}
```

---

## 3. cities 数组 — 旅居城市

每个城市对象包含以下字段：

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `id` | string | ✅ | 唯一标识，小写英文，用于内部引用 | `"chengdu"` |
| `name` | string | ✅ | 英文城市名 | `"Chengdu"` |
| `nameCN` | string | ✅ | 中文城市名 | `"成都"` |
| `province` | string | ✅ | 英文省份名（用于地图配色） | `"Sichuan"` |
| `provinceCN` | string | ✅ | 中文省份名 | `"四川"` |
| `lat` | number | ✅ | 纬度 | `30.5728` |
| `lng` | number | ✅ | 经度 | `104.0668` |
| `arrival` | string | ✅ | 到达日期 (YYYY-MM-DD) | `"2026-02-22"` |
| `departure` | string\|null | ✅ | 离开日期，当前城市填 `null` | `"2026-03-20"` 或 `null` |
| `stayDays` | number\|null | — | 停留天数，当前城市填 `null` | `35` |
| `stayLabel` | string | — | 英文停留时长描述 | `"5 weeks"` |
| `stayLabelCN` | string | — | 中文停留时长描述 | `"5 周"` |
| `isCurrent` | boolean | — | 是否为当前城市，仅当前城市设 `true` | `true` |
| `quote` | string | — | 英文一句话感想 | `"The mountain city..."` |
| `quoteCN` | string | — | 中文一句话感想 | `"山城地势..."` |
| `images` | string[] | — | 图片路径数组 | `["/images/travel/chengdu/panda.jpg"]` |
| `tastes` | object[] | — | 美食推荐数组，见 §6 | `[{"nameCN": "串串香", "name": "Chuan Chuan"}]` |
| `picks` | string[] | — | 推荐地点名称 | `["宽窄巷子", "熊猫基地"]` |
| `meal` | string | — | 英文代表美食 | `"Sichuan Hot Pot"` |
| `mealCN` | string | — | 中文代表美食 | `"四川火锅"` |
| `spots` | object[] | — | 地图标注点数组，见 §5 | 见下方 |

---

## 4. priorCities 数组 — 历史城市

旅居之前去过的城市。

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `id` | string | ✅ | 唯一标识 | `"nanchang"` |
| `name` | string | ✅ | 英文城市名 | `"Nanchang"` |
| `nameCN` | string | ✅ | 中文城市名 | `"南昌"` |
| `lat` | number | ✅ | 纬度 | `28.682` |
| `lng` | number | ✅ | 经度 | `115.8582` |
| `year` | string | ✅ | 英文时间描述 | `"2018-02-09 ~ 02-12"` 或 `"2013-2025"` |
| `yearCN` | string | ✅ | 中文时间描述 | `"2018-02-09 ~ 02-12"` |
| `quote` | string | — | 英文感想 | `"Where we met..."` |
| `quoteCN` | string | — | 中文感想 | `"大二相识..."` |
| `images` | string[] | — | 图片路径数组 | `[]` |
| `tastes` | object[] | — | 美食推荐 | `[]` |
| `picks` | string[] | — | 推荐地点 | `["弥敦道"]` |
| `mergeInto` | string | — | 合并到某个城市 id（多次到访同一地方时用） | `"dali"` |

> 🔑 `mergeInto`：如果你多次去过同一个城市（如两次去苏州），在第二条记录上设 `mergeInto: "suzhou-2014"`，地图上只显示一个 marker，但 story panel 会展示所有到访记录。

---

## 5. spots 子对象 — 地图标注点

在城市内的具体地点（景点、图书馆等），点击城市后地图上会显示小圆点。

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `name` | string | ✅ | 英文名 | `"Panda Base"` |
| `nameCN` | string | ✅ | 中文名 | `"熊猫基地"` |
| `lat` | number | ✅ | 纬度 | `30.7332` |
| `lng` | number | ✅ | 经度 | `104.1457` |
| `isLibrary` | boolean | — | 是否为图书馆/书店 | `true` |

---

## 6. tastes 子对象 — 美食推荐

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `name` | string | ✅ | 英文名 | `"Dan Dan Noodles"` |
| `nameCN` | string | ✅ | 中文名 | `"担担面"` |

---

## 7. 常见操作示例

### 添加新旅居城市

在 `cities` 数组末尾、最后一个 `}` 后加逗号，然后添加：

```json
{
  "id": "xian",
  "name": "Xi'an",
  "nameCN": "西安",
  "province": "Shaanxi",
  "provinceCN": "陕西",
  "lat": 34.3416,
  "lng": 108.9398,
  "arrival": "2026-03-31",
  "departure": null,
  "stayDays": null,
  "stayLabel": "Current",
  "stayLabelCN": "当前",
  "isCurrent": true,
  "quote": "Ancient capital, modern life.",
  "quoteCN": "千年古都，现代生活。",
  "images": [],
  "tastes": [{"nameCN": "肉夹馍", "name": "Roujiamo"}],
  "picks": ["兵马俑", "大雁塔"],
  "meal": "Biangbiang Noodles",
  "mealCN": "Biangbiang面",
  "spots": []
}
```

⚠️ 同时记得：
1. 把之前城市的 `isCurrent` 改为 `false`（或删掉该字段）
2. 把之前城市的 `departure` 填上离开日期
3. 更新 `meta.currentCity` 为新城市 id

### 添加照片

1. 把图片放到 `public/images/travel/城市名/` 目录下
2. 在城市的 `images` 数组中添加路径：

```json
"images": ["/images/travel/chengdu/hotpot.jpg", "/images/travel/chengdu/panda.jpg"]
```

### 添加美食推荐

在城市的 `tastes` 数组中添加：

```json
"tastes": [
  {"nameCN": "串串香", "name": "Chuan Chuan Xiang"},
  {"nameCN": "担担面", "name": "Dan Dan Noodles"}
]
```

### 添加景点

在城市的 `spots` 数组中添加：

```json
"spots": [
  {
    "name": "Dujiangyan Irrigation",
    "nameCN": "都江堰",
    "lat": 30.9984,
    "lng": 103.6107
  }
]
```

如果是图书馆/书店，加上 `"isLibrary": true`。

---

## 8. 图片路径规范

- 图片存放位置：`public/images/travel/城市英文名小写/`
  - 例：`public/images/travel/chengdu/panda.jpg`
- JSON 中写相对于网站根目录的路径：`/images/travel/chengdu/panda.jpg`
- 建议图片宽度 1200px 左右，16:9 比例最佳
- 支持 jpg/png/webp 格式
- 文件名用小写英文 + 连字符，避免空格和中文

---

## 9. 省份配色对照

地图上城市 marker 的颜色由 `province` 字段决定：

| Province | 颜色 | 色值 |
|----------|------|------|
| Yunnan | 翠绿 | `#10b981` |
| Guangxi | 橙金 | `#f59e0b` |
| Fujian | 海蓝 | `#0ea5e9` |
| Sichuan | 辣红 | `#ef4444` |
| Chongqing | 橙红 | `#f97316` |
| 其他 | 品牌紫 | `#8953d1` |

想要新省份的自定义颜色？在 `travel.astro` 的 `REGION_COLORS` 对象中添加即可。
