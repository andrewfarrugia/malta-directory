# Malta Service Hub

Static SEO site for Malta built with Astro and designed for Cloudflare Pages.

## Stack

- Astro (static output)
- Markdown/MDX guides
- JSON + Markdown data sources
- Cloudflare Pages deployment

## Key Features

- Category hubs (`/categories/{category}/`)
- Location hubs (`/locations/{location}/`)
- Quality-gated combo hubs (`/categories/{category}/{location}/`)
- Guides with RSS feed (`/guides/`, `/feed.xml`)
- Listings directory (`/listings/`)
- Client-side search (`/search/`, `/search-index.json/`)
- SEO metadata, canonical URLs, JSON-LD schema
- GDPR consent banner and legal pages
- Cloudflare `_headers` and `_redirects`

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run seo:validate
```

## Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Environment variables:
  - `SITE_URL=https://maltaservicehub.com`
  - `PUBLIC_ANALYTICS_PROVIDER=cloudflare`
  - `PUBLIC_CF_BEACON_TOKEN=<optional-token>`
  - `PUBLIC_PLAUSIBLE_DOMAIN=<optional-domain>`

## Data Model

- `src/data/categories.json`
- `src/data/locations.json`
- `src/data/listings.json`
- `src/data/combos/{category}__{location}.md`
- `src/content/guides/*.md`

## Quality Gate for Combo Pages

A combo page is generated only if at least 2 checks pass:

1. Unique editorial words >= 400
2. Curated listings >= 6
3. Unique FAQs >= 8
4. Unique price/comparison block exists

## Legal Notice

Legal pages in this repository are draft templates and require legal review before production publication.
