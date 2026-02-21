import { siteConfig } from "@/config/site";

export interface SeoInput {
  path: string;
  title: string;
  description: string;
  image?: string;
  noindex?: boolean;
}

export const absoluteUrl = (path: string) => {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, siteConfig.siteUrl).toString();
};

export const ensureTrailingSlash = (url: string) => {
  const parsed = new URL(url);
  if (!parsed.pathname.endsWith("/")) {
    parsed.pathname = `${parsed.pathname}/`;
  }
  return parsed.toString();
};

export const buildSeo = ({ path, title, description, image, noindex }: SeoInput) => {
  const canonical = ensureTrailingSlash(absoluteUrl(path));
  const finalTitle = title.includes(siteConfig.brandName)
    ? title
    : `${title} | ${siteConfig.brandName}`;

  return {
    title: finalTitle,
    description,
    canonical,
    image: image || absoluteUrl(siteConfig.socialImage),
    noindex: Boolean(noindex)
  };
};

export const clampMeta = (value: string, max = 160) => {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max - 1).trim()}...`;
};
