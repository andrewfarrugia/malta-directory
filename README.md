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

### Cloudflare API Automation (Local)

This repo includes local Cloudflare API scripts so you can manage Pages environment variables and trigger production deployments without using the dashboard for every change.

1. Copy `.env.cloudflare.example` to `.env.cloudflare`.
2. Fill required values:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_PAGES_PROJECT=malta-directory`
3. `.env.cloudflare` is ignored by git.

Minimum token scope recommendation:

- Account-level access for Pages project read/update.
- Permission to create/read Pages deployments.
- Do not grant unrelated zone-wide write scopes unless required for your setup.

Available commands:

```bash
# show production + preview env vars (table output)
npm run cf:env:get

# machine-readable output
npm run cf:env:get -- --json

# set a variable on production/preview
npm run cf:env:set -- --env production --key IMAGE_QUALITY_FAIL_ON_WARN --value false

# remove a variable from production/preview
npm run cf:env:unset -- --env production --key IMAGE_QUALITY_FAIL_ON_WARN

# preview payload without mutating Cloudflare
npm run cf:env:set -- --env production --key IMAGE_QUALITY_FAIL_ON_WARN --value false --dry-run

# trigger production deployment (main)
npm run cf:deploy:prod

# trigger and wait for final deployment status
npm run cf:deploy:prod -- --wait
```

### Preview vs Production Image Gate Policy

`images:validate` is strict only on production by default:

- **Production (main):** strict in CI (fails build on coverage warnings)
- **Preview branches:** warnings are reported, but build does not fail

Environment controls:

- `IMAGE_QUALITY_STRICT=true` → force strict mode
- `IMAGE_QUALITY_FAIL_ON_WARN=true` → hard fail on warnings (highest priority)
- `IMAGE_QUALITY_FAIL_ON_WARN=false` → never fail on warnings (emergency override)

Recommended Cloudflare setup:

- **Production env:** `IMAGE_QUALITY_STRICT=true`
- **Preview env:** `IMAGE_QUALITY_STRICT=false`

Emergency unblock runbook (production only):

1. Set temporary override:
   - `npm run cf:env:set -- --env production --key IMAGE_QUALITY_FAIL_ON_WARN --value false`
2. Trigger deploy:
   - `npm run cf:deploy:prod -- --wait`
3. Verify values:
   - `npm run cf:env:get`
4. After image coverage remediation, restore strict gate:
   - `npm run cf:env:unset -- --env production --key IMAGE_QUALITY_FAIL_ON_WARN`

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
