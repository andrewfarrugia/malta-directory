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

Create a local `.env` file:

```env
PEXELS_API_KEY=your_key_here
# Optional: force placeholder-only builds
# PEXELS_CACHE_WRITE=false
```

## Build

```bash
npm run build
npm run seo:validate
```

Build runs `npm run images:sync` before `astro build` to download/update local Pexels assets in `public/images/pexels/` and regenerate `src/data/pexels-image-manifest.json`.
By default, image sync runs in **missing-only mode** (only unfilled/broken slots are fetched).
Build also runs `npm run images:validate` and will block in CI/strict mode when selected image coverage is too low.

Useful image sync modes:

```bash
# default: fetch only missing/unusable slots
npm run images:sync

# force full refresh for all slots
npm run images:sync -- --refresh

# reprocess all slots without refresh flag semantics
npm run images:sync -- --all
```

## Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Environment variables:
  - `SITE_URL=https://maltaservicehub.com`
  - `PEXELS_API_KEY=<required-for-build-time-image-fetch>`
  - `PEXELS_CACHE_WRITE=false` (optional if you want to skip remote image refresh in CI)
  - `IMAGE_QUALITY_STRICT=true` (recommended in production CI)
  - `PUBLIC_ANALYTICS_PROVIDER=cloudflare`
  - `PUBLIC_CF_BEACON_TOKEN=<optional-token>`
  - `PUBLIC_PLAUSIBLE_DOMAIN=<optional-domain>`

## Production Image Refresh Runbook

1. Set `PEXELS_API_KEY` locally.
2. Run `npm run images:sync` (or `--refresh` for full recuration).
3. Run `npm run images:validate`.
4. Run `npm run build`.
5. Commit updated local image assets and manifest:
   - `public/images/pexels/**`
   - `src/data/pexels-image-manifest.json`

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
