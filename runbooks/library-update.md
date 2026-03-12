# Library Update Listener Runbook

目标：监听 Discord `#human` 频道（ID: `1481555785975726110`）里 Rex 的自然语言更新，把内容同步到 Library 数据源，然后自动构建、推送，并通过 Telegram 发确认。

## 覆盖场景

支持这类消息：

- `看完了三体，评分 9`
- `在看 Foundation`
- `Dark Forest 笔记：很精彩的续集`

## 文件

- 页面：`src/pages/lab/library/index.astro`
- 书籍：`src/data/books.json`
- 影视：`src/data/media.json`
- 解析脚本：`scripts/library-update-listener.mjs`
- 封面脚本：`scripts/fetch-book-covers.mjs`

## 监听逻辑

建议 cron / worker 每分钟做一次：

1. 拉取 Discord `#human` 最新消息，只处理 Rex 本人的新消息。
2. 用消息文本调用解析脚本：
   ```bash
   node scripts/library-update-listener.mjs "看完了三体，评分 9"
   ```
3. 先 dry-run 看输出 JSON 是否正确。
4. 确认没问题后 apply：
   ```bash
   node scripts/library-update-listener.mjs --apply "看完了三体，评分 9"
   ```
5. 如果这次新增的是书籍，也可以按需补跑封面：
   ```bash
   node scripts/fetch-book-covers.mjs
   ```
6. 构建校验：
   ```bash
   npm run build
   npx astro check
   ```
7. 提交并推送：
   ```bash
   git add src/data/books.json src/data/media.json
   git commit -m "chore: update library from #human"
   git push
   ```
8. Telegram 通知 Rex 确认：
   - 说明哪条消息被解析
   - 说明改到了 `books.json` 还是 `media.json`
   - 附上 rating / note / status 摘要

## 解析规则

`scripts/library-update-listener.mjs` 会尝试抽取：

- `title`：条目标题
- `status`：`done` / `doing` / `note`
- `rating`：例如 `评分 9`
- `note`：例如 `笔记：很精彩的续集`
- `hintedType`：消息里出现电影/剧等关键词时优先匹配 media

匹配顺序：

1. 先按 `books.json` 精确匹配标题（若消息里没有明显影视提示）
2. 再按 `media.json` 的 `title` / `titleEn` 匹配
3. 找不到则报错，等待人工补条目

## CLI 用法

```bash
# 只解析，不落盘
node scripts/library-update-listener.mjs "在看 Foundation"

# 落盘更新 JSON
node scripts/library-update-listener.mjs --apply "Dark Forest 笔记：很精彩的续集"
```

输出会带：

- 命中的文件
- 解析结果
- 更新前 / 更新后对象

## 建议的 cron 封装

实际 cron 可以包一层 shell / Node worker：

1. 读 Discord 最新消息
2. 去重（按 message id 落一个 checkpoint）
3. 调用解析脚本 dry-run
4. dry-run 成功后 `--apply`
5. build + check + git push
6. Telegram 发确认

## 失败处理

出现这些情况就不要自动 push：

- 标题没匹配上
- `npm run build` 失败
- `npx astro check` 失败
- git push 失败

失败时把原消息、解析报错、当前分支状态发到 Telegram/ops，等人工确认。
