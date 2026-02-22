import fs from "node:fs/promises";
import path from "node:path";
import componentMap from "../src/data/pexels-component-map.json" with { type: "json" };
import categories from "../src/data/categories.json" with { type: "json" };
import locations from "../src/data/locations.json" with { type: "json" };

const strictMode = process.argv.includes("--strict");
const refreshMode = process.argv.includes("--refresh");
const fullSyncMode = process.argv.includes("--all");
const missingOnlyMode = !refreshMode && !fullSyncMode;
const apiKey = process.env.PEXELS_API_KEY;
const allowRemoteSync = process.env.PEXELS_CACHE_WRITE !== "false";

const rootDir = process.cwd();
const publicDir = path.join(rootDir, "public");
const manifestPath = path.join(rootDir, "src/data/pexels-image-manifest.json");
const pexelsDir = path.join(publicDir, "images/pexels");
const placeholderJpgPath = "/images/placeholder-malta.jpg";
const placeholderWebpPath = "/images/placeholder-malta.webp";

const targetWidths = [640, 960, 1280];
const jpgQuality = 78;
const webpQuality = 75;
const minScoreByIntentClass = {
  service: 38,
  locality: 46,
  hybrid: 42
};
const perPage = 10;

const readManifest = async () => {
  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : { generatedAt: "", images: {} };
  } catch {
    return { generatedAt: "", images: {} };
  }
};

const tokenize = (value) =>
  (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const asStringArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : value ? [value] : []);
const normalizeToken = (token) => token.toLowerCase().replace(/[^a-z0-9]/g, "");
const singularize = (token) => token.replace(/s$/, "");
const pluralize = (token) => (token.endsWith("s") ? token : `${token}s`);

const tokenVariants = (token) => {
  const normalized = normalizeToken(token);
  if (!normalized) return [];
  const variants = new Set([normalized, singularize(normalized), pluralize(normalized)]);
  if (normalized === "technician") variants.add("worker");
  if (normalized === "service") variants.add("services");
  return [...variants];
};

const hasTokenMatch = (haystackSet, token) => tokenVariants(token).some((variant) => haystackSet.has(variant));
const stopTokens = new Set(["service", "services", "professional", "malta", "in", "local", "home"]);

const flattenTokens = (values) =>
  values
    .flatMap((value) => tokenize(value))
    .map(normalizeToken)
    .filter(Boolean);

const uniqueTokens = (values) => [...new Set(values)];

const getLocationName = (slug) => locations.find((location) => location.slug === slug)?.name || slug;

const fillTemplate = (template, values) =>
  template
    .replaceAll("{category}", values.category || "")
    .replaceAll("{categorySingular}", values.categorySingular || "")
    .replaceAll("{categoryPlural}", values.categoryPlural || "")
    .replaceAll("{location}", values.location || "");

const inferSlotIntentClass = (slotId) => {
  if (slotId.startsWith("home-mosaic-")) return "locality";
  if (slotId.startsWith("home-feature-")) return "hybrid";
  if (slotId.startsWith("featured-location-")) return "locality";
  return "service";
};

const resolveIntent = (slotId, baseIntent = {}) => {
  const slotIntentClass = baseIntent.slotIntentClass || inferSlotIntentClass(slotId);
  const requiredLocalityTokens = uniqueTokens(flattenTokens(asStringArray(baseIntent.requiredLocalityTokens)));
  return {
    ...baseIntent,
    slotIntentClass,
    requiredLocalityTokens
  };
};

const extractServiceToken = (slot) => {
  const required = asStringArray(slot.intent?.mustInclude);
  const normalized = uniqueTokens(flattenTokens(required)).filter((token) => !stopTokens.has(token));
  return normalized[0] || "service";
};

const extractLocalityToken = (slot) => {
  const fromRequired = uniqueTokens(flattenTokens(asStringArray(slot.intent?.requiredLocalityTokens))).find(
    (token) => token !== "malta"
  );
  if (fromRequired) return fromRequired;
  const contextTokens = uniqueTokens(flattenTokens(asStringArray(slot.intent?.locationContext)));
  return contextTokens.find((token) => token !== "malta") || "malta";
};

const getSlots = () => {
  const slots = [];

  for (const item of componentMap.homeIconStrip) {
    slots.push({
      id: item.id,
      queries: asStringArray(componentMap.queries[item.id]),
      intent: resolveIntent(item.id, componentMap.slotIntents[item.id]),
      alt: componentMap.slotIntents[item.id]?.altTemplate || `${item.title} service support in Malta`
    });
  }

  for (const item of componentMap.homeFeatured) {
    slots.push({
      id: item.id,
      queries: asStringArray(componentMap.queries[item.id]),
      intent: resolveIntent(item.id, componentMap.slotIntents[item.id]),
      alt: componentMap.slotIntents[item.id]?.altTemplate || `${item.title} in ${item.locality}`
    });
  }

  for (const item of componentMap.homeMosaic) {
    slots.push({
      id: item.id,
      queries: asStringArray(componentMap.queries[item.id]),
      intent: resolveIntent(item.id, componentMap.slotIntents[item.id]),
      alt: componentMap.slotIntents[item.id]?.altTemplate || `${item.title} locality context in Malta`
    });
  }

  for (const item of componentMap.pageMastheads || []) {
    slots.push({
      id: item.id,
      queries: asStringArray(componentMap.queries[item.id] || `${item.title} Malta`),
      intent: resolveIntent(item.id, componentMap.slotIntents[item.id]),
      alt: componentMap.slotIntents[item.id]?.altTemplate || `${item.title} visual context in Malta`
    });
  }

  for (const category of categories) {
    const values = {
      category: category.singularName.toLowerCase(),
      categorySingular: category.singularName,
      categoryPlural: category.pluralName
    };

    slots.push({
      id: `category-${category.slug}-hero`,
      queries: asStringArray(fillTemplate(componentMap.queryTemplates.categoryHero, values)),
      intent: resolveIntent(`category-${category.slug}-hero`, {
        ...componentMap.intentTemplates.categoryHero,
        slotIntentClass: "service",
        mustInclude: componentMap.intentTemplates.categoryHero.mustInclude.map((token) => fillTemplate(token, values))
      }),
      alt: fillTemplate(componentMap.intentTemplates.categoryHero.altTemplate, values)
    });

    slots.push({
      id: `category-${category.slug}-tile-1`,
      queries: asStringArray(fillTemplate(componentMap.queryTemplates.categoryTileOne, values)),
      intent: resolveIntent(`category-${category.slug}-tile-1`, {
        ...componentMap.intentTemplates.categoryTileOne,
        slotIntentClass: "service",
        mustInclude: componentMap.intentTemplates.categoryTileOne.mustInclude.map((token) => fillTemplate(token, values))
      }),
      alt: fillTemplate(componentMap.intentTemplates.categoryTileOne.altTemplate, values)
    });

    slots.push({
      id: `category-${category.slug}-tile-2`,
      queries: asStringArray(fillTemplate(componentMap.queryTemplates.categoryTileTwo, values)),
      intent: resolveIntent(`category-${category.slug}-tile-2`, {
        ...componentMap.intentTemplates.categoryTileTwo,
        slotIntentClass: "service",
        mustInclude: componentMap.intentTemplates.categoryTileTwo.mustInclude.map((token) => fillTemplate(token, values))
      }),
      alt: fillTemplate(componentMap.intentTemplates.categoryTileTwo.altTemplate, values)
    });

    slots.push({
      id: `guide-${category.slug}`,
      queries: asStringArray(componentMap.queries[`guide-${category.slug}`] || `${category.singularName} guidance Malta`),
      intent: resolveIntent(`guide-${category.slug}`, {
        ...componentMap.intentTemplates.guide,
        slotIntentClass: "service",
        mustInclude: componentMap.intentTemplates.guide.mustInclude.map((token) => fillTemplate(token, values))
      }),
      alt: fillTemplate(componentMap.intentTemplates.guide.altTemplate, values)
    });
  }

  for (const item of componentMap.homeFeatured) {
    const hrefParts = item.href.split("/").filter(Boolean);
    const locationSlug = hrefParts[2] || "malta";
    const locationName = getLocationName(locationSlug);
    slots.push({
      id: `featured-location-${locationSlug}`,
      queries: asStringArray(`${locationName} Malta neighborhood and services`),
      intent: resolveIntent(`featured-location-${locationSlug}`, {
        ...componentMap.intentTemplates.featuredLocation,
        slotIntentClass: "locality",
        mustInclude: componentMap.intentTemplates.featuredLocation.mustInclude.map((token) =>
          fillTemplate(token, { location: locationName })
        ),
        requiredLocalityTokens: [locationName, "malta"]
      }),
      alt: fillTemplate(componentMap.intentTemplates.featuredLocation.altTemplate, { location: locationName })
    });
  }

  const seen = new Set();
  return slots.filter((slot) => {
    if (seen.has(slot.id)) return false;
    seen.add(slot.id);
    return true;
  });
};

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const importSharp = async () => {
  try {
    const mod = await import("sharp");
    return mod.default || mod;
  } catch {
    return null;
  }
};

const toPexelsUrl = (query) =>
  `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;

const fetchPexelsPhotos = async (query) => {
  if (!apiKey) return [];
  try {
    const response = await fetch(toPexelsUrl(query), {
      headers: { Authorization: apiKey }
    });
    if (!response.ok) return [];
    const data = await response.json();
    const photos = Array.isArray(data.photos) ? data.photos : [];
    return photos
      .map((photo, index) => ({
        rank: index + 1,
        src: photo?.src?.large || photo?.src?.medium || photo?.src?.original || "",
        alt: photo?.alt || "",
        width: photo?.width || 0,
        height: photo?.height || 0,
        photographer: photo?.photographer || "",
        photographerUrl: photo?.photographer_url || "",
        photoUrl: photo?.url || ""
      }))
      .filter((photo) => Boolean(photo.src));
  } catch {
    return [];
  }
};

const candidateHaystack = (candidate) => {
  const tokens = tokenize(`${candidate.alt} ${candidate.photoUrl} ${candidate.photographerUrl} ${candidate.photographer}`);
  return new Set(tokens.map(normalizeToken).filter(Boolean));
};

const candidateMatchesLocality = (slot, candidate) => {
  const requiredLocalityTokens = asStringArray(slot.intent?.requiredLocalityTokens);
  if (requiredLocalityTokens.length === 0) return false;
  const haystack = candidateHaystack(candidate);
  return requiredLocalityTokens.some((token) => hasTokenMatch(haystack, token));
};

const candidateMatchesService = (slot, candidate) => {
  const requiredServiceTokens = uniqueTokens(flattenTokens(asStringArray(slot.intent?.mustInclude))).filter(
    (token) => !stopTokens.has(token)
  );
  if (requiredServiceTokens.length === 0) return true;
  const haystack = candidateHaystack(candidate);
  return requiredServiceTokens.some((token) => hasTokenMatch(haystack, token));
};

const scoreCandidate = (slot, candidate) => {
  const reasons = [];
  let score = 0;
  const intentClass = slot.intent?.slotIntentClass || "service";
  const haystack = candidateHaystack(candidate);

  const required = asStringArray(slot.intent?.mustInclude).map((token) => token.toLowerCase()).filter(Boolean);
  const banned = asStringArray(slot.intent?.mustNotInclude).map((token) => token.toLowerCase()).filter(Boolean);
  const locationContext = asStringArray(slot.intent?.requiredLocalityTokens).flatMap((token) => tokenize(token));

  const requiredBoost = intentClass === "service" ? 10 : 14;
  const missingPenalty = intentClass === "service" ? 4 : 9;

  for (const token of required) {
    if (hasTokenMatch(haystack, token)) {
      score += requiredBoost;
      reasons.push(`mustInclude:${token}`);
    } else {
      score -= missingPenalty;
      reasons.push(`missing:${token}`);
    }
  }

  for (const token of banned) {
    if (hasTokenMatch(haystack, token)) {
      score -= 25;
      reasons.push(`mustNotInclude:${token}`);
    }
  }

  for (const token of locationContext) {
    if (hasTokenMatch(haystack, token)) {
      score += 7;
      reasons.push(`location:${token}`);
    }
  }

  const ratio = candidate.width > 0 && candidate.height > 0 ? candidate.width / candidate.height : 1.5;
  if (ratio >= 1.2 && ratio <= 2.1) {
    score += 18;
    reasons.push("landscape-fit");
  } else {
    score -= 12;
    reasons.push("poor-aspect-fit");
  }

  score += Math.max(0, 24 - candidate.rank * 2);
  reasons.push(`rank:${candidate.rank}`);

  return { score: Math.max(0, Math.min(100, score)), reasons };
};

const getIntentThreshold = (slot) => {
  const intentClass = slot.intent?.slotIntentClass || "service";
  return minScoreByIntentClass[intentClass] ?? 42;
};

const buildQueryCandidates = (slot) => {
  const uniqueQueries = new Set(asStringArray(slot.queries).map((q) => q.trim()).filter(Boolean));
  const intentClass = slot.intent?.slotIntentClass || "service";
  const serviceToken = extractServiceToken(slot);
  const localityToken = extractLocalityToken(slot);

  if (intentClass === "service") {
    uniqueQueries.add(`${serviceToken} professional at work`);
    uniqueQueries.add("home service technician tools");
  } else if (intentClass === "locality") {
    uniqueQueries.add(`${localityToken} Malta streets cityscape`);
    uniqueQueries.add(`${localityToken} Malta urban architecture`);
  } else {
    uniqueQueries.add(`${serviceToken} ${localityToken} Malta`);
    uniqueQueries.add(`${serviceToken} in Malta`);
  }

  return [...uniqueQueries].slice(0, 3);
};

const selectBestCandidate = (slot, candidates) => {
  const ranked = candidates
    .map((candidate) => {
      const scored = scoreCandidate(slot, candidate);
      return { ...candidate, ...scored };
    })
    .sort((a, b) => b.score - a.score);

  const selected = ranked[0];
  if (!selected || selected.score < getIntentThreshold(slot)) return null;
  return selected;
};

const enforceIntentRules = (slot, candidate, queryIndex) => {
  const intentClass = slot.intent?.slotIntentClass || "service";
  if (intentClass === "service") return candidateMatchesService(slot, candidate);
  if (intentClass === "locality") return candidateMatchesLocality(slot, candidate);
  const serviceOk = candidateMatchesService(slot, candidate);
  if (!serviceOk) return false;
  if (queryIndex < 2) return candidateMatchesLocality(slot, candidate);
  return true;
};

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const buildFallbackEntry = (slot, reason) => ({
  id: slot.id,
  query: slot.queries?.[0] || "",
  triedQueries: buildQueryCandidates(slot),
  alt: slot.alt,
  fallback: true,
  status: "fallback",
  intentClass: slot.intent?.slotIntentClass || "service",
  sourceMode: "fallback",
  score: 0,
  selectedFrom: 0,
  reasons: [reason],
  lastCheckedAt: new Date().toISOString(),
  variants: [
    {
      width: 1200,
      height: 800,
      webp: placeholderWebpPath,
      jpg: placeholderJpgPath
    }
  ]
});

const syncSlot = async ({ slot, sharp, existingEntry }) => {
  if (
    missingOnlyMode &&
    existingEntry &&
    existingEntry.status === "selected" &&
    existingEntry.variants?.length > 0 &&
    existingEntry.variants.every((variant) => variant.jpg.startsWith("/images/pexels/"))
  ) {
    const present = await Promise.all(
      existingEntry.variants.flatMap((variant) => [
        fileExists(path.join(publicDir, variant.jpg.replace(/^\//, ""))),
        fileExists(path.join(publicDir, variant.webp.replace(/^\//, "")))
      ])
    );
    if (present.every(Boolean)) return existingEntry;
  }

  if (!allowRemoteSync) {
    return existingEntry || buildFallbackEntry(slot, "remote-sync-disabled");
  }

  if (!sharp) {
    return buildFallbackEntry(slot, "sharp-unavailable");
  }

  const queries = buildQueryCandidates(slot);
  let best = null;
  let selectedQuery = "";

  for (let i = 0; i < queries.length; i += 1) {
    const query = queries[i];
    const candidates = await fetchPexelsPhotos(query);
    const filtered = candidates.filter((candidate) => enforceIntentRules(slot, candidate, i));
    best = selectBestCandidate(slot, filtered);
    if (best) {
      selectedQuery = query;
      break;
    }
  }

  if (!best) {
    return buildFallbackEntry(slot, apiKey ? "no-candidate-over-threshold" : "missing-api-key");
  }

  try {
    const response = await fetch(best.src);
    if (!response.ok) return buildFallbackEntry(slot, "image-download-failed");
    const inputBuffer = Buffer.from(await response.arrayBuffer());
    const baseImage = sharp(inputBuffer);
    const metadata = await baseImage.metadata();
    const slotDir = path.join(pexelsDir, slot.id);
    await ensureDir(slotDir);

    const variants = [];
    for (const width of targetWidths) {
      const effectiveWidth = metadata.width ? Math.min(width, metadata.width) : width;
      const resized = baseImage.clone().resize({ width: effectiveWidth, withoutEnlargement: true });
      const jpgBuffer = await resized.clone().jpeg({ quality: jpgQuality }).toBuffer();
      const webpBuffer = await resized.clone().webp({ quality: webpQuality }).toBuffer();
      const meta = await sharp(jpgBuffer).metadata();
      const fileBase = `${slot.id}-${effectiveWidth}`;
      const jpgRelative = `/images/pexels/${slot.id}/${fileBase}.jpg`;
      const webpRelative = `/images/pexels/${slot.id}/${fileBase}.webp`;
      await fs.writeFile(path.join(publicDir, jpgRelative.replace(/^\//, "")), jpgBuffer);
      await fs.writeFile(path.join(publicDir, webpRelative.replace(/^\//, "")), webpBuffer);
      variants.push({
        width: meta.width || effectiveWidth,
        height: meta.height || Math.round((effectiveWidth * 2) / 3),
        jpg: jpgRelative,
        webp: webpRelative
      });
    }

    return {
      id: slot.id,
      query: selectedQuery || slot.queries[0] || "",
      triedQueries: queries,
      alt: slot.alt,
      photographer: best.photographer,
      photographerUrl: best.photographerUrl,
      photoUrl: best.photoUrl,
      fallback: false,
      status: "selected",
      intentClass: slot.intent?.slotIntentClass || "service",
      sourceMode: "direct",
      score: best.score,
      selectedFrom: best.rank,
      reasons: best.reasons,
      lastCheckedAt: new Date().toISOString(),
      variants
    };
  } catch {
    return buildFallbackEntry(slot, "processing-failed");
  }
};

const main = async () => {
  const sharp = await importSharp();
  const manifest = await readManifest();
  const slots = getSlots();
  await ensureDir(pexelsDir);

  const images = { ...(manifest.images || {}) };
  let fallbackCount = 0;
  let selectedCount = 0;

  for (const slot of slots) {
    const entry = await syncSlot({ slot, sharp, existingEntry: images[slot.id] });
    entry.intentClass = entry.intentClass || slot.intent?.slotIntentClass || inferSlotIntentClass(slot.id);
    entry.sourceMode = entry.sourceMode || (entry.fallback ? "fallback" : "direct");
    images[slot.id] = entry;
    if (entry.fallback) fallbackCount += 1;
    else selectedCount += 1;
  }

  const nextManifest = {
    generatedAt: new Date().toISOString(),
    images
  };

  await fs.writeFile(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`, "utf8");
  console.log(`[pexels] selected=${selectedCount} fallback=${fallbackCount} total=${slots.length}`);

  if (strictMode && fallbackCount > 0) {
    process.exit(1);
  }
};

main().catch((error) => {
  console.error("[pexels] sync failed", error);
  if (strictMode) process.exit(1);
});
