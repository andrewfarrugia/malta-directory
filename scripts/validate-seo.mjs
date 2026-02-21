import fs from "node:fs";
import path from "node:path";

const distDir = path.resolve("dist");
if (!fs.existsSync(distDir)) {
  console.error("Run build first: dist/ not found.");
  process.exit(1);
}

const htmlFiles = [];
const walk = (dir) => {
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else if (file.endsWith(".html")) {
      htmlFiles.push(full);
    }
  }
};
walk(distDir);

const titles = new Map();
const descriptions = new Map();
let errors = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/is);
  const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);

  if (!titleMatch || !descMatch || !h1Match || !canonicalMatch) {
    console.error(`Missing SEO primitives in ${file}`);
    errors += 1;
    continue;
  }

  const rel = file.replace(distDir, "") || "/";
  const title = titleMatch[1].trim();
  const desc = descMatch[1].trim();

  if (titles.has(title)) {
    console.error(`Duplicate title: '${title}' in ${rel} and ${titles.get(title)}`);
    errors += 1;
  } else {
    titles.set(title, rel);
  }

  if (descriptions.has(desc)) {
    console.error(`Duplicate description in ${rel} and ${descriptions.get(desc)}`);
    errors += 1;
  } else {
    descriptions.set(desc, rel);
  }
}

if (errors > 0) {
  console.error(`SEO validation failed with ${errors} issue(s).`);
  process.exit(1);
}

console.log(`SEO validation passed for ${htmlFiles.length} HTML files.`);
