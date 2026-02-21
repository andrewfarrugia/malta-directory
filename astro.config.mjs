import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

const site = process.env.SITE_URL || "https://maltaservicehub.com";

export default defineConfig({
  site,
  output: "static",
  trailingSlash: "always",
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes("/search/") && !page.endsWith("/search-index.json")
    })
  ]
});
