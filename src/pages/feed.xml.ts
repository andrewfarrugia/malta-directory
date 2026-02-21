import rss from "@astrojs/rss";
import { getGuides } from "@/lib/data";
import { siteConfig } from "@/config/site";

export async function GET(context) {
  const guides = await getGuides();

  return rss({
    title: "Malta Service Hub Guides",
    description: "Latest Malta Service Hub guide updates",
    site: context.site || siteConfig.siteUrl,
    items: guides.map((guide) => ({
      title: guide.data.title,
      description: guide.data.description,
      pubDate: guide.data.datePublished,
      link: `/guides/${guide.slug}/`
    }))
  });
}
