import type { BreadcrumbItem, Listing } from "@/lib/types";
import { absoluteUrl } from "@/lib/seo";
import { siteConfig } from "@/config/site";

export const organizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.brandName,
  url: siteConfig.siteUrl,
  email: siteConfig.contactEmail,
  sameAs: []
});

export const breadcrumbSchema = (items: BreadcrumbItem[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.url)
  }))
});

export const faqSchema = (faqs: Array<{ q: string; a: string }>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.a
    }
  }))
});

export const localBusinessSchema = (listing: Listing) => ({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: listing.name,
  description: listing.shortDescription,
  telephone: listing.phone,
  email: listing.email,
  url: listing.website,
  address: {
    "@type": "PostalAddress",
    streetAddress: listing.address.line1,
    addressLocality: listing.address.locality,
    postalCode: listing.address.postalCode,
    addressCountry: listing.address.country
  },
  geo: listing.geo
    ? {
        "@type": "GeoCoordinates",
        latitude: listing.geo.lat,
        longitude: listing.geo.lng
      }
    : undefined,
  openingHours: listing.openingHours,
  sameAs: listing.socialLinks
});
