import { z } from "zod";

export const categorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  singularName: z.string(),
  pluralName: z.string(),
  primaryKeyword: z.string(),
  synonyms: z.array(z.string()),
  intro: z.string(),
  faq: z.array(z.object({ q: z.string(), a: z.string() })),
  relatedCategoryIds: z.array(z.string()),
  topGuideSlugs: z.array(z.string()),
  priority: z.number().min(1).max(5)
});

export const locationSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  region: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  intro: z.string(),
  nearbyLocationIds: z.array(z.string()),
  priority: z.number().min(1).max(5)
});

export const listingSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  categorySlugs: z.array(z.string()).min(1),
  locationSlug: z.string(),
  address: z.object({
    line1: z.string(),
    locality: z.string(),
    postalCode: z.string().optional(),
    country: z.string()
  }),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().url().optional(),
  openingHours: z.array(z.string()).optional(),
  geo: z
    .object({
      lat: z.number(),
      lng: z.number()
    })
    .optional(),
  images: z.array(z.string()),
  shortDescription: z.string(),
  tags: z.array(z.string()),
  socialLinks: z.array(z.string()),
  lastVerifiedDate: z.string(),
  sourceNotes: z.string()
});

export const comboFrontmatterSchema = z.object({
  titleOverride: z.string().optional(),
  descriptionOverride: z.string().optional(),
  uniqueIntro: z.string().default(""),
  priceRange: z.string().optional(),
  faqs: z.array(z.object({ q: z.string(), a: z.string() })).default([])
});
