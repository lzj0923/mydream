export function nextAvailableContentSlug(base: string, existingSlugs: readonly string[]) {
  const normalizedBase = base.trim().toLowerCase();
  const taken = new Set(existingSlugs.map((slug) => slug.trim().toLowerCase()));
  if (!taken.has(normalizedBase)) return normalizedBase;
  let suffix = 2;
  while (taken.has(`${normalizedBase}-${suffix}`)) suffix += 1;
  return `${normalizedBase}-${suffix}`;
}
