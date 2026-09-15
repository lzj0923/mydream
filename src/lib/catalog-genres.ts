/** Catalog genres may contain several tags; never treat the whole string as a category. */
export function catalogGenres(value: string): string[] {
  return [...new Set(value.split(/[、,，;；|｜/\n\r]+/u).map(tag => tag.trim()).filter(Boolean))];
}
