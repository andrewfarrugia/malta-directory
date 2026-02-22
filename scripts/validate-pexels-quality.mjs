import fs from "node:fs/promises";
import path from "node:path";
import manifest from "../src/data/pexels-image-manifest.json" with { type: "json" };

const rootDir = process.cwd();
const publicDir = path.join(rootDir, "public");
const strict = process.env.CI === "true" || process.env.IMAGE_QUALITY_STRICT === "true";

const minSelectedCoverage = Number(process.env.PEXELS_MIN_SELECTED_COVERAGE || 0.9);
const minHomeSelectedCoverage = Number(process.env.PEXELS_MIN_HOME_SELECTED_COVERAGE || 0.95);

const ids = Object.keys(manifest.images || {});
const images = Object.values(manifest.images || {});

const missingFiles = [];
const wrongWebp = [];

const exists = async (relativePath) => {
  try {
    await fs.access(path.join(publicDir, relativePath.replace(/^\//, "")));
    return true;
  } catch {
    return false;
  }
};

for (const [id, image] of Object.entries(manifest.images || {})) {
  for (const variant of image.variants || []) {
    if (!(await exists(variant.jpg))) missingFiles.push(`${id}: missing jpg ${variant.jpg}`);
    if (variant.webp.endsWith(".webp")) {
      if (!(await exists(variant.webp))) missingFiles.push(`${id}: missing webp ${variant.webp}`);
    } else if (!image.fallback) {
      wrongWebp.push(`${id}: non-fallback has non-webp source ${variant.webp}`);
    }
  }
}

const isFallback = (img) => img.fallback || img.status === "fallback";
const fallbackCount = images.filter(isFallback).length;
const globalFallbackRatio = ids.length ? fallbackCount / ids.length : 1;
const selectedCoverage = 1 - globalFallbackRatio;

const homeIds = ids.filter((id) => id.startsWith("home-"));
const homeFallback = homeIds.filter((id) => isFallback(manifest.images[id])).length;
const homeFallbackRatio = homeIds.length ? homeFallback / homeIds.length : 1;
const homeSelectedCoverage = 1 - homeFallbackRatio;

const issues = [];
if (missingFiles.length > 0) issues.push(...missingFiles);
if (wrongWebp.length > 0) issues.push(...wrongWebp);
if (selectedCoverage < minSelectedCoverage) {
  issues.push(
    `selected coverage too low: ${selectedCoverage.toFixed(2)} < ${minSelectedCoverage.toFixed(2)}`
  );
}
if (homeSelectedCoverage < minHomeSelectedCoverage) {
  issues.push(
    `home selected coverage too low: ${homeSelectedCoverage.toFixed(2)} < ${minHomeSelectedCoverage.toFixed(2)}`
  );
}

console.log(
  `[images:validate] total=${ids.length} fallback=${fallbackCount} globalRatio=${globalFallbackRatio.toFixed(2)} homeRatio=${homeFallbackRatio.toFixed(2)}`
);

if (issues.length > 0) {
  console.warn("[images:validate] issues found:");
  for (const issue of issues) console.warn(`- ${issue}`);
  if (strict) process.exit(1);
}
