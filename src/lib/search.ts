import type { SearchDocument } from "@/lib/types";

export const tokenize = (value: string) =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

export const scoreSearchDocument = (doc: SearchDocument, query: string) => {
  const terms = tokenize(query);
  if (terms.length === 0) return 0;

  const haystack = `${doc.title} ${doc.tags.join(" ")} ${doc.description || ""}`.toLowerCase();

  let score = 0;
  for (const term of terms) {
    if (doc.title.toLowerCase().includes(term)) score += 5;
    if (haystack.includes(term)) score += 2;
    if (doc.tags.some((tag) => tag.toLowerCase().includes(term))) score += 3;
  }

  return score;
};

export const filterDocuments = (docs: SearchDocument[], query: string, type = "all") => {
  const scored = docs
    .filter((doc) => (type === "all" ? true : doc.type === type))
    .map((doc) => ({ doc, score: scoreSearchDocument(doc, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.doc);

  return scored.slice(0, 50);
};
