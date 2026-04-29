import fs from 'fs';
import { transform } from 'astro/compiler';
const src = fs.readFileSync('src/pages/portfolio.astro', 'utf8');
const r = await transform(src, { pathname: '/portfolio', projectRoot: '.' });
if (r.diagnostics && r.diagnostics.length > 0) {
  r.diagnostics.forEach(d => console.log('DIAG:', JSON.stringify(d)));
}
fs.writeFileSync('/tmp/portfolio-compiled-new.js', r.code);
console.log('Lines:', r.code.split('\n').length);
