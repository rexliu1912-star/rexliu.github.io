---
description: 更新 Flomo 笔记统计数据到 Activity Graph
---

# 更新 Flomo 数据

## 前提条件
- 已从 Flomo 导出新的 HTML 文件
- 文件已放置到 `src/data/flomo-20260111-diary.html`（或更新脚本中的文件名）

## 执行步骤

// turbo
1. 运行预处理脚本，将 HTML 转换为 JSON：
```bash
node scripts/process-flomo.cjs
```

// turbo
2. 提交并推送更新后的统计数据：
```bash
git add src/data/flomo-stats.json && git commit -m "update: flomo stats" && git push origin main
```

3. 等待 GitHub Actions 部署完成（约 2-3 分钟）

## 验证
- 访问网站查看 Activity Graph
- 确认 "XX notes" 数字已更新
