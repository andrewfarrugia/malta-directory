import type { APIRoute } from "astro";
import { siteConfig } from "@/config/site";
import {
  getCategories,
  getLocations,
  getListings,
  getGuides
} from "@/lib/data";
import { getQualifiedCombos } from "@/lib/combo";

const withSlash = (path: string) => {
  const normalized = path.endsWith("/") ? path : `${path}/`;
  return new URL(normalized, siteConfig.siteUrl).toString();
};

export const GET: APIRoute = async () => {
  const categories = getCategories();
  const locations = getLocations();
  const listings = getListings();
  const guides = await getGuides();
  const combos = getQualifiedCombos();

  const urls = [
    "/",
    "/categories/",
    "/locations/",
    "/guides/",
    "/about/",
    "/contact/",
    "/privacy/",
    "/terms/",
    "/cookies/",
    "/legal/",
    "/disclaimer/",
    "/listings/",
    ...categories.map((category) => `/categories/${category.slug}/`),
    ...locations.map((location) => `/locations/${location.slug}/`),
    ...combos.map((combo) => `/categories/${combo.categorySlug}/${combo.locationSlug}/`),
    ...guides.map((guide) => `/guides/${guide.slug}/`),
    ...listings.map((listing) => `/listings/${listing.slug}/`)
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((url) => `  <url><loc>${withSlash(url)}</loc></url>`)
  .join("\n")}
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
};
