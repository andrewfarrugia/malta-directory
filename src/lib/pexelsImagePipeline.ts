import manifestRaw from "@/data/pexels-image-manifest.json";
import componentMap from "@/data/pexels-component-map.json";

export interface LocalPexelsVariant {
  width: number;
  height: number;
  webp: string;
  jpg: string;
}

export interface LocalPexelsImage {
  id: string;
  query: string;
  alt: string;
  photographer?: string;
  photographerUrl?: string;
  photoUrl?: string;
  fallback: boolean;
  status?: "selected" | "fallback";
  score?: number;
  selectedFrom?: number;
  reasons?: string[];
  lastCheckedAt?: string;
  variants: LocalPexelsVariant[];
}

interface Manifest {
  generatedAt: string;
  images: Record<string, LocalPexelsImage>;
}

const manifest = manifestRaw as Manifest;

const placeholderVariant: LocalPexelsVariant = {
  width: 867,
  height: 541,
  webp: "/images/placeholder-malta.webp",
  jpg: "/images/placeholder-malta.jpg"
};

export const getPexelsImage = (id: string, altFallback = "Service photo in Malta"): LocalPexelsImage => {
  const existing = manifest.images[id];
  if (existing && existing.variants.length > 0) return existing;
  return {
    id,
    query: "",
    alt: altFallback,
    fallback: true,
    variants: [placeholderVariant]
  };
};

export const getPexelsImages = (ids: string[]) => ids.map((id) => getPexelsImage(id));

export const toPictureData = (image: LocalPexelsImage) => {
  const variants = [...image.variants].sort((a, b) => a.width - b.width);
  const largest = variants[variants.length - 1] || placeholderVariant;
  const hasWebp = !image.fallback && variants.some((item) => item.webp.endsWith(".webp"));
  const webpSrcset = hasWebp ? variants.map((item) => `${item.webp} ${item.width}w`).join(", ") : "";
  const jpgSrcset = variants.map((item) => `${item.jpg} ${item.width}w`).join(", ");
  return {
    alt: image.alt,
    width: largest.width,
    height: largest.height,
    hasWebp,
    webpSrcset,
    jpgSrcset,
    src: largest.jpg,
    photographer: image.photographer,
    photographerUrl: image.photographerUrl,
    photoUrl: image.photoUrl,
    fallback: image.fallback
  };
};

export const getPexelsComponentMap = () => componentMap;
