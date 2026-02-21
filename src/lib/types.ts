export interface CategoryFaq {
  q: string;
  a: string;
}

export interface Category {
  id: string;
  slug: string;
  singularName: string;
  pluralName: string;
  primaryKeyword: string;
  synonyms: string[];
  intro: string;
  faq: CategoryFaq[];
  relatedCategoryIds: string[];
  topGuideSlugs: string[];
  priority: number;
}

export interface Location {
  id: string;
  slug: string;
  name: string;
  region?: string;
  lat?: number;
  lng?: number;
  intro: string;
  nearbyLocationIds: string[];
  priority: number;
}

export interface Listing {
  id: string;
  slug: string;
  name: string;
  categorySlugs: string[];
  locationSlug: string;
  address: {
    line1: string;
    locality: string;
    postalCode?: string;
    country: string;
  };
  phone?: string;
  email?: string;
  website?: string;
  openingHours?: string[];
  geo?: {
    lat: number;
    lng: number;
  };
  images: string[];
  shortDescription: string;
  tags: string[];
  socialLinks: string[];
  lastVerifiedDate: string;
  sourceNotes: string;
}

export interface ComboFaq {
  q: string;
  a: string;
}

export interface ComboEditorial {
  slugKey: string;
  categorySlug: string;
  locationSlug: string;
  titleOverride?: string;
  descriptionOverride?: string;
  uniqueIntro: string;
  priceRange?: string;
  faqs: ComboFaq[];
  body: string;
}

export interface SearchDocument {
  title: string;
  url: string;
  type: "category" | "location" | "combo" | "guide" | "listing" | "page";
  tags: string[];
  description?: string;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}
