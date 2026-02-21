import { defineCollection, z } from "astro:content";

const guides = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    datePublished: z.coerce.date(),
    dateUpdated: z.coerce.date(),
    categorySlugs: z.array(z.string()).min(1),
    locationSlugs: z.array(z.string()).optional(),
    intent: z.enum(["pricing", "how-to-choose", "best-of", "checklist"]),
    author: z.string()
  })
});

export const collections = { guides };
