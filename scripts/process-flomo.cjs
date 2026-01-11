/**
 * 预处理 Flomo HTML 导出文件，生成只包含日期统计的 JSON
 * 运行方式: node scripts/process-flomo.js
 */

const fs = require('fs');
const path = require('path');

// 输入：Flomo HTML 导出文件
const FLOMO_HTML_PATH = path.join(__dirname, '../src/data/flomo-20260111-diary.html');
// 输出：只包含日期统计的 JSON（不含任何内容）
const FLOMO_JSON_PATH = path.join(__dirname, '../src/data/flomo-stats.json');

function processFlomoData() {
  if (!fs.existsSync(FLOMO_HTML_PATH)) {
    console.error('❌ Flomo HTML 文件不存在:', FLOMO_HTML_PATH);
    process.exit(1);
  }

  const html = fs.readFileSync(FLOMO_HTML_PATH, 'utf-8');
  
  // 只提取日期，不提取内容
  const dateRegex = /<div class="time">(\d{4}-\d{2}-\d{2})\s+\d{2}:\d{2}:\d{2}<\/div>/g;
  const countByDate = {};
  let match;
  let totalNotes = 0;

  while ((match = dateRegex.exec(html)) !== null) {
    const dateStr = match[1];
    if (dateStr) {
      countByDate[dateStr] = (countByDate[dateStr] || 0) + 1;
      totalNotes++;
    }
  }

  // 生成 JSON（只有日期和数量，无任何内容）
  const output = {
    generatedAt: new Date().toISOString(),
    totalNotes,
    totalDays: Object.keys(countByDate).length,
    countByDate
  };

  fs.writeFileSync(FLOMO_JSON_PATH, JSON.stringify(output, null, 2));
  
  console.log('✅ Flomo 数据预处理完成！');
  console.log(`   总笔记数: ${totalNotes}`);
  console.log(`   覆盖天数: ${Object.keys(countByDate).length}`);
  console.log(`   输出文件: ${FLOMO_JSON_PATH}`);
}

processFlomoData();
