import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { getCollection } from "astro:content";
import categoriesRaw from "@/data/categories.json";
import locationsRaw from "@/data/locations.json";
import listingsRaw from "@/data/listings.json";
import type { Category, ComboEditorial, Listing, Location } from "@/lib/types";
import { categorySchema, comboFrontmatterSchema, listingSchema, locationSchema } from "@/lib/schemas";

const categories = categorySchema.array().parse(categoriesRaw) as Category[];
const locations = locationSchema.array().parse(locationsRaw) as Location[];
const listings = listingSchema.array().parse(listingsRaw) as Listing[];

let comboCache: ComboEditorial[] | null = null;

export const getCategories = () => categories;
export const getLocations = () => locations;
export const getListings = () => listings;

export const getCategoryBySlug = (slug: string) => categories.find((item) => item.slug === slug);
export const getLocationBySlug = (slug: string) => locations.find((item) => item.slug === slug);
export const getListingBySlug = (slug: string) => listings.find((item) => item.slug === slug);

export const getListingsForCategory = (categorySlug: string) =>
  listings.filter((listing) => listing.categorySlugs.includes(categorySlug));

export const getListingsForLocation = (locationSlug: string) =>
  listings.filter((listing) => listing.locationSlug === locationSlug);

export const getListingsForCombo = (categorySlug: string, locationSlug: string) =>
  listings.filter(
    (listing) => listing.locationSlug === locationSlug && listing.categorySlugs.includes(categorySlug)
  );

export const getRelatedCategories = (category: Category) =>
  category.relatedCategoryIds
    .map((id) => categories.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is Category => Boolean(candidate));

export const getNearbyLocations = (location: Location) =>
  location.nearbyLocationIds
    .map((id) => locations.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is Location => Boolean(candidate));

export const getTopCategories = (limit = 12) =>
  [...categories].sort((a, b) => b.priority - a.priority).slice(0, limit);

export const getTopLocations = (limit = 12) =>
  [...locations].sort((a, b) => b.priority - a.priority).slice(0, limit);

const combosDir = path.resolve("src/data/combos");

export const getComboEditorials = (): ComboEditorial[] => {
  if (comboCache) {
    return comboCache;
  }

  if (!fs.existsSync(combosDir)) {
    comboCache = [];
    return comboCache;
  }

  const files = fs.readdirSync(combosDir).filter((file) => file.endsWith(".md"));

  comboCache = files.map((file) => {
    const fullPath = path.join(combosDir, file);
    const raw = fs.readFileSync(fullPath, "utf8");
    const parsed = matter(raw);
    const key = file.replace(/\.md$/, "");
    const [categorySlug, locationSlug] = key.split("__");
    const frontmatter = comboFrontmatterSchema.parse(parsed.data);

    return {
      slugKey: key,
      categorySlug,
      locationSlug,
      titleOverride: frontmatter.titleOverride,
      descriptionOverride: frontmatter.descriptionOverride,
      uniqueIntro: frontmatter.uniqueIntro,
      priceRange: frontmatter.priceRange,
      faqs: frontmatter.faqs,
      body: parsed.content.trim()
    } as ComboEditorial;
  });

  return comboCache;
};

export const getComboEditorial = (categorySlug: string, locationSlug: string) =>
  getComboEditorials().find(
    (combo) => combo.categorySlug === categorySlug && combo.locationSlug === locationSlug
  );

export const getGuides = async () => {
  const guides = await getCollection("guides");
  return guides.sort(
    (a, b) => new Date(b.data.datePublished).getTime() - new Date(a.data.datePublished).getTime()
  );
};

export const getGuidesByCategory = async (categorySlug: string, limit = 6) => {
  const guides = await getGuides();
  return guides.filter((guide) => guide.data.categorySlugs.includes(categorySlug)).slice(0, limit);
};

export const getGuidesByLocation = async (locationSlug: string, limit = 6) => {
  const guides = await getGuides();
  return guides.filter((guide) => (guide.data.locationSlugs || []).includes(locationSlug)).slice(0, limit);
};

export const getGuideBySlug = async (slug: string) => {
  const guides = await getGuides();
  return guides.find((guide) => guide.slug === slug);
};

export const validateCrossReferences = async () => {
  const categorySlugs = new Set(categories.map((category) => category.slug));
  const locationSlugs = new Set(locations.map((location) => location.slug));

  for (const listing of listings) {
    if (!locationSlugs.has(listing.locationSlug)) {
      throw new Error(`Listing '${listing.slug}' has unknown location '${listing.locationSlug}'.`);
    }

    for (const categorySlug of listing.categorySlugs) {
      if (!categorySlugs.has(categorySlug)) {
        throw new Error(`Listing '${listing.slug}' has unknown category '${categorySlug}'.`);
      }
    }
  }

  const guides = await getGuides();
  for (const guide of guides) {
    for (const categorySlug of guide.data.categorySlugs) {
      if (!categorySlugs.has(categorySlug)) {
        throw new Error(`Guide '${guide.slug}' references unknown category '${categorySlug}'.`);
      }
    }

    for (const locationSlug of guide.data.locationSlugs || []) {
      if (!locationSlugs.has(locationSlug)) {
        throw new Error(`Guide '${guide.slug}' references unknown location '${locationSlug}'.`);
      }
    }
  }
};
