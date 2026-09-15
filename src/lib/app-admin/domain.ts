export const modules = {
  users: { title: "App 用戶", path: "user/user", fields: ["id", "username", "nickname", "email", "mobile", "status", "createtime"], statuses: ["normal", "hidden"], editable: ["username", "nickname", "email", "mobile"] },
  dramas: { title: "短劇管理", path: "short/drama", fields: ["id", "title", "description", "cover_image", "status", "drama_count", "total_views", "updated_at"], statuses: ["published", "draft", "inactive"], editable: ["title", "description"] },
  episodes: { title: "劇集管理", path: "short/episode", fields: ["id", "title", "status", "drama_num", "views", "created_at"], statuses: ["published", "draft", "inactive"], editable: ["title"] },
  videos: { title: "創作者視頻", path: "creator/video", fields: ["id", "title", "description", "status", "view_count", "createtime"], statuses: ["normal", "hidden", "audit"], editable: ["title", "description"] },
} as const;
export type Module = keyof typeof modules;
export type Row = Record<string, string | number | boolean | null>;
export function moduleKey(value: string): Module {
  if (!Object.hasOwn(modules, value)) throw new Error("無效的管理模塊");
  return value as Module;
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("App 後台返回格式異常");
  return value as Record<string, unknown>;
}
export function projectRow(key: Module, value: unknown): Row {
  const raw = record(value), result: Row = {};
  for (const field of modules[key].fields) {
    const item = raw[field];
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean" || item === null) result[field] = item;
  }
  if (key === "episodes" && raw.drama && typeof raw.drama === "object") result.dramaTitle = String(record(raw.drama).title ?? "");
  return result;
}
export function editFields(key: Module, input: unknown) {
  const value = record(input), result: Record<string, string> = {};
  for (const [field, item] of Object.entries(value)) {
    if (!(modules[key].editable as readonly string[]).includes(field) || typeof item !== "string") throw new Error("不允許修改該字段");
    if (item.length > (field === "description" ? 2000 : 240)) throw new Error("填寫內容過長");
    result[field] = item.trim();
  }
  if (!Object.keys(result).length) throw new Error("沒有需要保存的內容");
  return result;
}
export function formToken(html: string) {
  for (const input of html.match(/<input\b[^>]*>/gi) ?? []) {
    if (/\bname\s*=\s*["']__token__["']/i.test(input)) return input.match(/\bvalue\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
  }
  return "";
}
