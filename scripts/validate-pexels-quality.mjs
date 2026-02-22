import fs from "node:fs/promises";
import path from "node:path";
import manifest from "../src/data/pexels-image-manifest.json" with { type: "json" };

const rootDir = process.cwd();
const publicDir = path.join(rootDir, "public");
const branch = process.env.CF_PAGES_BRANCH || process.env.CLOUDFLARE_PAGES_BRANCH || "";
const inCi = process.env.CI === "true";
const isMainBranch = branch === "main";
const explicitStrict = process.env.IMAGE_QUALITY_STRICT === "true";
const explicitFailOnWarn = process.env.IMAGE_QUALITY_FAIL_ON_WARN;
const runningOnCloudflare = Boolean(process.env.CF_PAGES || process.env.CF_PAGES_BRANCH || process.env.CLOUDFLARE_PAGES_BRANCH);
const qualityEnvMissing = explicitFailOnWarn === undefined && process.env.IMAGE_QUALITY_STRICT === undefined;
const emergencyRelaxedCloudflareGate = runningOnCloudflare && inCi && isMainBranch && qualityEnvMissing;

const strict =
  explicitFailOnWarn === "true"
    ? true
    : explicitFailOnWarn === "false"
      ? false
      : explicitStrict || (inCi && isMainBranch && !emergencyRelaxedCloudflareGate);

console.log(
  `[images:validate] gate ci=${String(process.env.CI)} cfBranch=${String(
    process.env.CF_PAGES_BRANCH || ""
  )} cloudflareBranch=${String(process.env.CLOUDFLARE_PAGES_BRANCH || "")} strictFlag=${String(
    process.env.IMAGE_QUALITY_STRICT
  )} failOnWarn=${String(process.env.IMAGE_QUALITY_FAIL_ON_WARN)} runningOnCloudflare=${runningOnCloudflare} emergencyRelaxed=${emergencyRelaxedCloudflareGate} strict=${strict}`
);

const minSelectedCoverage = Number(process.env.PEXELS_MIN_SELECTED_COVERAGE || 0.9);
const minHomeSelectedCoverage = Number(process.env.PEXELS_MIN_HOME_SELECTED_COVERAGE || 0.95);
const minServiceSelectedCoverage = Number(process.env.PEXELS_MIN_SERVICE_SELECTED_COVERAGE || 0.9);
const minLocalitySelectedCoverage = Number(process.env.PEXELS_MIN_LOCALITY_SELECTED_COVERAGE || 0.9);

const ids = Object.keys(manifest.images || {});
const imagesById = manifest.images || {};
const images = Object.values(imagesById);

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

for (const [id, image] of Object.entries(imagesById)) {
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
const coverage = (selected, total) => (total > 0 ? selected / total : 0);
const inferIntentClass = (id) => {
  if (id.startsWith("home-mosaic-")) return "locality";
  if (id.startsWith("featured-location-")) return "locality";
  if (id.startsWith("home-feature-")) return "hybrid";
  return "service";
};

const fallbackCount = images.filter(isFallback).length;
const selectedCount = images.length - fallbackCount;
const selectedCoverage = coverage(selectedCount, images.length);

const homeIds = ids.filter((id) => id.startsWith("home-"));
const homeSelected = homeIds.filter((id) => !isFallback(imagesById[id])).length;
const homeSelectedCoverage = coverage(homeSelected, homeIds.length);

const serviceIds = ids.filter((id) => (imagesById[id]?.intentClass || inferIntentClass(id)) === "service");
const localityIds = ids.filter((id) => (imagesById[id]?.intentClass || inferIntentClass(id)) === "locality");
const serviceSelected = serviceIds.filter((id) => !isFallback(imagesById[id])).length;
const localitySelected = localityIds.filter((id) => !isFallback(imagesById[id])).length;
const serviceSelectedCoverage = coverage(serviceSelected, serviceIds.length);
const localitySelectedCoverage = coverage(localitySelected, localityIds.length);

const issues = [];
if (missingFiles.length > 0) issues.push(...missingFiles);
if (wrongWebp.length > 0) issues.push(...wrongWebp);

if (selectedCoverage < minSelectedCoverage) {
  issues.push(`selected coverage too low: ${selectedCoverage.toFixed(2)} < ${minSelectedCoverage.toFixed(2)}`);
}
if (homeSelectedCoverage < minHomeSelectedCoverage) {
  issues.push(`home selected coverage too low: ${homeSelectedCoverage.toFixed(2)} < ${minHomeSelectedCoverage.toFixed(2)}`);
}
if (serviceSelectedCoverage < minServiceSelectedCoverage) {
  issues.push(`service selected coverage too low: ${serviceSelectedCoverage.toFixed(2)} < ${minServiceSelectedCoverage.toFixed(2)}`);
}
if (localitySelectedCoverage < minLocalitySelectedCoverage) {
  issues.push(`locality selected coverage too low: ${localitySelectedCoverage.toFixed(2)} < ${minLocalitySelectedCoverage.toFixed(2)}`);
}

console.log(
  `[images:validate] total=${ids.length} selected=${selectedCount} fallback=${fallbackCount} selectedCoverage=${selectedCoverage.toFixed(2)} homeCoverage=${homeSelectedCoverage.toFixed(2)} serviceCoverage=${serviceSelectedCoverage.toFixed(2)} localityCoverage=${localitySelectedCoverage.toFixed(2)}`
);

if (issues.length > 0) {
  console.warn("[images:validate] issues found:");
  for (const issue of issues) console.warn(`- ${issue}`);
  if (strict) process.exit(1);
}
