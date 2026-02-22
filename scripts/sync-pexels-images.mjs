import fs from "node:fs/promises";
import path from "node:path";
import componentMap from "../src/data/pexels-component-map.json" with { type: "json" };
import categories from "../src/data/categories.json" with { type: "json" };
import locations from "../src/data/locations.json" with { type: "json" };

const strictMode = process.argv.includes("--strict");
const refreshMode = process.argv.includes("--refresh");
const apiKey = process.env.PEXELS_API_KEY;
const allowRemoteSync = process.env.PEXELS_CACHE_WRITE !== "false";

const rootDir = process.cwd();
const publicDir = path.join(rootDir, "public");
const manifestPath = path.join(rootDir, "src/data/pexels-image-manifest.json");
const pexelsDir = path.join(publicDir, "images/pexels");
const placeholderPath = "/images/placeholder.jpg";

const targetWidths = [640, 960, 1280];
const jpgQuality = 78;
const webpQuality = 75;

const readManifest = async () => {
  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : { generatedAt: "", images: {} };
  } catch {
    return { generatedAt: "", images: {} };
  }
};

const getLocationName = (slug) => locations.find((location) => location.slug === slug)?.name || slug;

const getSlots = () => {
  const homeSlots = [
    ...componentMap.homeIconStrip.map((item) => ({
      id: item.id,
      query: componentMap.queries[item.id],
      alt: `${item.title} service support in Malta`
    })),
    ...componentMap.homeFeatured.map((item) => ({
      id: item.id,
      query: componentMap.queries[item.id],
      alt: `${item.title} in ${item.locality}`
    })),
    ...componentMap.homeMosaic.map((item) => ({
      id: item.id,
      query: componentMap.queries[item.id],
      alt: `${item.title} locality context in Malta`
    }))
  ];

  const categorySlots = categories.flatMap((category) => [
    {
      id: `category-${category.slug}-hero`,
      query: componentMap.queryTemplates.categoryHero.replace("{category}", category.singularName.toLowerCase()),
      alt: `${category.pluralName} service work in Malta`
    },
    {
      id: `category-${category.slug}-tile-1`,
      query: componentMap.queryTemplates.categoryTileOne.replace("{category}", category.singularName.toLowerCase()),
      alt: `${category.singularName} equipment and setup in Malta`
    },
    {
      id: `category-${category.slug}-tile-2`,
      query: componentMap.queryTemplates.categoryTileTwo.replace("{category}", category.singularName.toLowerCase()),
      alt: `${category.singularName} on-site service in Malta`
    }
  ]);

  const guideSlots = categories.map((category) => ({
    id: `guide-${category.slug}`,
    query: componentMap.queries[`guide-${category.slug}`] || `${category.singularName} guidance Malta`,
    alt: `${category.pluralName} guide visual in Malta`
  }));

  const locationFeatured = componentMap.homeFeatured.map((item) => {
    const hrefParts = item.href.split("/").filter(Boolean);
    const locationSlug = hrefParts[2] || "malta";
    const locationName = getLocationName(locationSlug);
    return {
      id: `featured-location-${locationSlug}`,
      query: `${locationName} Malta neighborhood and services`,
      alt: `${locationName} service locality in Malta`
    };
  });

  return [...homeSlots, ...categorySlots, ...guideSlots, ...locationFeatured];
};

const uniqueById = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
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
  `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`;

const fetchPexelsPhoto = async (query) => {
  if (!apiKey) return null;
  try {
    const response = await fetch(toPexelsUrl(query), {
      headers: { Authorization: apiKey }
    });
    if (!response.ok) return null;
    const data = await response.json();
    const photo = Array.isArray(data.photos) ? data.photos[0] : null;
    if (!photo || !photo.src) return null;
    const src = photo.src.large || photo.src.medium || photo.src.original;
    if (!src) return null;
    return {
      src,
      width: photo.width,
      height: photo.height,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      photoUrl: photo.url
    };
  } catch {
    return null;
  }
};

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const syncSlot = async ({ slot, sharp, existingEntry }) => {
  const fallbackEntry = {
    id: slot.id,
    query: slot.query,
    alt: slot.alt,
    fallback: true,
    variants: [
      {
        width: 1200,
        height: 800,
        webp: placeholderPath,
        jpg: placeholderPath
      }
    ]
  };

  if (!refreshMode && existingEntry?.variants?.every((variant) => !variant.jpg.startsWith("/images/placeholder"))) {
    const allFilesPresent = await Promise.all(
      existingEntry.variants.flatMap((variant) => [
        fileExists(path.join(publicDir, variant.webp.replace(/^\//, ""))),
        fileExists(path.join(publicDir, variant.jpg.replace(/^\//, "")))
      ])
    );
    if (allFilesPresent.every(Boolean)) {
      return existingEntry;
    }
  }

  if (!allowRemoteSync) {
    return existingEntry || fallbackEntry;
  }

  const photo = await fetchPexelsPhoto(slot.query);
  if (!photo || !sharp) return fallbackEntry;

  try {
    const imageResponse = await fetch(photo.src);
    if (!imageResponse.ok) return fallbackEntry;
    const inputBuffer = Buffer.from(await imageResponse.arrayBuffer());
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
      const resizedMeta = await sharp(jpgBuffer).metadata();
      const fileBase = `${slot.id}-${effectiveWidth}`;
      const jpgRelative = `/images/pexels/${slot.id}/${fileBase}.jpg`;
      const webpRelative = `/images/pexels/${slot.id}/${fileBase}.webp`;
      await fs.writeFile(path.join(publicDir, jpgRelative.replace(/^\//, "")), jpgBuffer);
      await fs.writeFile(path.join(publicDir, webpRelative.replace(/^\//, "")), webpBuffer);
      variants.push({
        width: resizedMeta.width || effectiveWidth,
        height: resizedMeta.height || Math.round((effectiveWidth * 2) / 3),
        jpg: jpgRelative,
        webp: webpRelative
      });
    }

    return {
      id: slot.id,
      query: slot.query,
      alt: slot.alt,
      photographer: photo.photographer,
      photographerUrl: photo.photographerUrl,
      photoUrl: photo.photoUrl,
      fallback: false,
      variants
    };
  } catch {
    return fallbackEntry;
  }
};

const main = async () => {
  const sharp = await importSharp();
  const manifest = await readManifest();
  const slots = uniqueById(getSlots());
  await ensureDir(pexelsDir);

  const images = { ...(manifest.images || {}) };
  const failures = [];

  for (const slot of slots) {
    const entry = await syncSlot({ slot, sharp, existingEntry: images[slot.id] });
    images[slot.id] = entry;
    if (entry.fallback) failures.push(slot.id);
  }

  const nextManifest = {
    generatedAt: new Date().toISOString(),
    images
  };

  await fs.writeFile(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`, "utf8");

  if (failures.length > 0) {
    console.warn(`[pexels] fallback used for ${failures.length} slots`);
  }

  if ((failures.length > 0 && strictMode) || !sharp) {
    if (!sharp) console.warn("[pexels] sharp not available; placeholder fallback used");
    if (strictMode) process.exit(1);
  }
};

main().catch((error) => {
  console.error("[pexels] sync failed", error);
  if (strictMode) process.exit(1);
});
