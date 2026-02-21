import type { APIRoute } from "astro";
import { siteConfig } from "@/config/site";

export const GET: APIRoute = () => {
  const body = `User-agent: *
Allow: /
Disallow: /search/
Disallow: /search-index.json
Disallow: /tags/

Sitemap: ${siteConfig.siteUrl}/sitemap.xml
Sitemap: ${siteConfig.siteUrl}/sitemap-index.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
};
