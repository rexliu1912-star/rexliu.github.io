import { readFile, writeFile } from "node:fs/promises";
import { glob } from "node:fs/promises";
import path from "node:path";

const distDir = new URL("../dist/", import.meta.url);

for await (const rel of glob("**/*.html", { cwd: distDir })) {
  const file = new URL(rel, distDir);
  let html = await readFile(file, "utf8");

  // Default search index keeps English copy to avoid bilingual duplicates.
  html = html.replace(/class="lang-zh"/g, 'class="lang-zh" data-pagefind-ignore');

  // Keep UI chrome / icon-only controls out of the index.
  html = html.replace(/id="main-header"/g, 'id="main-header" data-pagefind-ignore');
  html = html.replace(/id="minimal-player"/g, 'id="minimal-player" data-pagefind-ignore');

  await writeFile(file, html);
}

console.log("prepare-pagefind: html patched for clean indexing");
