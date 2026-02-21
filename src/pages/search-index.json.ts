import type { APIRoute } from "astro";
import {
  getCategories,
  getLocations,
  getGuides
} from "@/lib/data";
import { getQualifiedCombos } from "@/lib/combo";
import type { SearchDocument } from "@/lib/types";

export const GET: APIRoute = async () => {
  const categories = getCategories();
  const locations = getLocations();
  const guides = await getGuides();
  const combos = getQualifiedCombos();

  const docs: SearchDocument[] = [
    {
      title: "Malta Service Hub",
      url: "/",
      type: "page",
      tags: ["malta service hub", "directory", "guides"],
      description: "Local directory and practical guides for Malta services."
    },
    {
      title: "Categories",
      url: "/categories/",
      type: "page",
      tags: ["categories", "services"],
      description: "Browse service categories in Malta."
    },
    {
      title: "Locations",
      url: "/locations/",
      type: "page",
      tags: ["locations", "localities", "malta"],
      description: "Browse covered localities in Malta."
    },
    {
      title: "Guides",
      url: "/guides/",
      type: "page",
      tags: ["guides", "pricing", "checklists"],
      description: "Evergreen service guides for Malta."
    },
    ...categories.map((category) => ({
      title: `${category.pluralName} in Malta`,
      url: `/categories/${category.slug}/`,
      type: "category" as const,
      tags: [category.primaryKeyword, ...category.synonyms],
      description: category.intro
    })),
    ...locations.map((location) => ({
      title: `Services in ${location.name}`,
      url: `/locations/${location.slug}/`,
      type: "location" as const,
      tags: [location.name, location.region || "malta locality"],
      description: location.intro
    })),
    ...combos.map((combo) => ({
      title: `${combo.categorySlug.replaceAll("-", " ")} in ${combo.locationSlug.replaceAll("-", " ")}`,
      url: `/categories/${combo.categorySlug}/${combo.locationSlug}/`,
      type: "combo" as const,
      tags: [combo.categorySlug, combo.locationSlug, "malta"],
      description: "Combined local category hub"
    })),
    ...guides.map((guide) => ({
      title: guide.data.title,
      url: `/guides/${guide.slug}/`,
      type: "guide" as const,
      tags: [...guide.data.categorySlugs, ...(guide.data.locationSlugs || []), guide.data.intent],
      description: guide.data.description
    }))
  ];

  return new Response(JSON.stringify(docs), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=900"
    }
  });
};
