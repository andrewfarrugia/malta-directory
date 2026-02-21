export const siteConfig = {
  brandName: "Malta Service Hub",
  siteUrl: process.env.SITE_URL || "https://maltaservicehub.com",
  defaultTitle: "Malta Service Hub - Local directory and guides for Malta",
  defaultDescription:
    "Independent Malta services directory and practical local guides compiled from publicly available information.",
  socialImage: "/images/og-default.svg",
  contactEmail: "hello@maltaservicehub.com",
  analytics: {
    provider: import.meta.env.PUBLIC_ANALYTICS_PROVIDER || "cloudflare",
    cloudflareBeaconToken: import.meta.env.PUBLIC_CF_BEACON_TOKEN || "",
    plausibleDomain: import.meta.env.PUBLIC_PLAUSIBLE_DOMAIN || ""
  }
} as const;

export const seoDefaults = {
  twitterCard: "summary_large_image",
  locale: "en_MT"
} as const;
