export const titleCaseFromSlug = (slug: string) =>
  slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const estimateReadTime = (content: string) => {
  const words = content.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
};

export const sentence = (value: string) => {
  if (!value) return value;
  return value.endsWith(".") ? value : `${value}.`;
};
