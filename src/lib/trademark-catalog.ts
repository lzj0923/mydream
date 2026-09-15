import products from "../data/tipo-products.json" with { type: "json" };

export type CatalogItem = { code: string; name: string };
export type CatalogMiddle = CatalogItem & { lowItems: CatalogItem[] };
export type CatalogGroup = CatalogItem & { middleItems: CatalogMiddle[] };
export type CatalogClass = CatalogItem & { topItems: CatalogGroup[] };
export type GoodsSelection = { class: string; names: string; codes: string; selectedCodes?: string[]; customNames?: string[] };

// Snapshot of the exact public endpoint used by S040WV1, fetched 2026-09-07.
export const trademarkCatalog: CatalogClass[] = products;
export const catalogSource = "https://tiponet.tipo.gov.tw/S040DV1/api/products";
export const classItems = (category: CatalogClass) => category.topItems.flatMap((group) => group.middleItems.flatMap((middle) => middle.lowItems));
export const findClass = (code: string) => trademarkCatalog.find((category) => category.code === code.padStart(3, "0"));

export function makeGoodsSelection(code: string, selectedCodes: string[], customNames: string[]): GoodsSelection {
  const category = findClass(code);
  if (!category) throw new Error("商品類別不存在");
  const selected = new Set(selectedCodes);
  const items = classItems(category).filter((item) => selected.has(item.code));
  const custom = [...new Set(customNames.map((name) => name.trim()).filter(Boolean))];
  return { class: category.code, selectedCodes: items.map((item) => item.code), customNames: custom,
    names: [...new Set([...items.map((item) => item.name), ...custom])].join("\n"), codes: items.map((item) => item.code).join("\n") };
}

export function filterCatalog(query: string): CatalogClass[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return trademarkCatalog;
  const matches = (item: CatalogItem) => `${item.code} ${item.name}`.toLocaleLowerCase().includes(needle);
  return trademarkCatalog.map((category) => matches(category) ? category : { ...category, topItems: category.topItems.map((group) => matches(group) ? group : { ...group,
    middleItems: group.middleItems.map((middle) => matches(middle) ? middle : { ...middle, lowItems: middle.lowItems.filter(matches) }).filter((middle) => middle.lowItems.length),
  }).filter((group) => group.middleItems.length) }).filter((category) => category.topItems.length);
}
