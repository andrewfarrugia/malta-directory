import {
  getCategories,
  getLocations,
  getComboEditorial,
  getListingsForCombo,
  getComboEditorials
} from "@/lib/data";
import { evaluateComboQuality } from "@/lib/quality";

export interface QualifiedCombo {
  categorySlug: string;
  locationSlug: string;
  qualityScore: number;
}

let cache: QualifiedCombo[] | null = null;

export const getQualifiedCombos = (): QualifiedCombo[] => {
  if (cache) {
    return cache;
  }

  const categories = getCategories();
  const locations = getLocations();
  const editorials = getComboEditorials();

  cache = [];
  const skipped: string[] = [];

  for (const category of categories) {
    for (const location of locations) {
      const combo = editorials.find(
        (item) => item.categorySlug === category.slug && item.locationSlug === location.slug
      );
      const listings = getListingsForCombo(category.slug, location.slug);
      const quality = evaluateComboQuality(combo, listings.length);
      if (quality.passed) {
        cache.push({
          categorySlug: category.slug,
          locationSlug: location.slug,
          qualityScore: quality.score
        });
      } else if (combo) {
        const failedChecks = Object.entries(quality.checks)
          .filter(([, passed]) => !passed)
          .map(([name]) => name)
          .join(", ");
        skipped.push(`${category.slug}/${location.slug} (failed: ${failedChecks})`);
      }
    }
  }

  if (skipped.length > 0) {
    console.warn(
      `[combo-quality] Skipped ${skipped.length} combos that did not meet quality thresholds.`
    );
  }

  return cache;
};

export const isQualifiedCombo = (categorySlug: string, locationSlug: string) =>
  getQualifiedCombos().some(
    (combo) => combo.categorySlug === categorySlug && combo.locationSlug === locationSlug
  );

export const getQualifiedComboEditorial = (categorySlug: string, locationSlug: string) => {
  if (!isQualifiedCombo(categorySlug, locationSlug)) {
    return undefined;
  }

  return getComboEditorial(categorySlug, locationSlug);
};
