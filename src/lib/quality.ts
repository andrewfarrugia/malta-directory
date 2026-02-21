import type { ComboEditorial } from "@/lib/types";

export interface ComboQualityResult {
  passed: boolean;
  score: number;
  checks: {
    editorialWords: boolean;
    listingCount: boolean;
    faqCount: boolean;
    hasPriceRangeOrComparison: boolean;
  };
}

const wordCount = (text: string) =>
  text
    .replace(/[\n\r]+/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

export const evaluateComboQuality = (
  combo: ComboEditorial | undefined,
  curatedListingCount: number
): ComboQualityResult => {
  const editorialWords = wordCount(`${combo?.uniqueIntro || ""} ${combo?.body || ""}`) >= 400;
  const listingCount = curatedListingCount >= 6;
  const faqCount = (combo?.faqs?.length || 0) >= 8;
  const hasPriceRangeOrComparison = Boolean(combo?.priceRange);

  const checks = {
    editorialWords,
    listingCount,
    faqCount,
    hasPriceRangeOrComparison
  };

  const score = Object.values(checks).filter(Boolean).length;

  return {
    passed: score >= 2,
    score,
    checks
  };
};
