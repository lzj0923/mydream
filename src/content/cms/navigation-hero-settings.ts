export const heroNumberFields = [
  ["titleSize", "主標題字號", 56, 28, 88], ["subtitleSize", "副標題字號", 24, 14, 40],
  ["bodySize", "說明字號", 16, 12, 28], ["mobileTitleSize", "手機主標題字號", 38, 24, 56],
  ["mobileSubtitleSize", "手機副標題字號", 20, 14, 32], ["mobileBodySize", "手機說明字號", 14, 12, 24],
  ["top", "電腦文字距頂部", 110, 24, 260], ["mobileTop", "手機文字距頂部", 72, 24, 160],
  ["width", "電腦文字區寬度", 720, 360, 960], ["gap", "文字段落間距", 14, 4, 40], ["left", "電腦文字最小左邊距", 32, 16, 200],
  ["height", "電腦首屏最小高度", 620, 400, 900], ["mobileHeight", "手機首屏最小高度", 560, 360, 900],
] as const;
export const heroColorFields = [["titleColor", "主標題顏色", "#f4c542"], ["subtitleColor", "副標題顏色", "#f5f7ff"], ["bodyColor", "說明文字顏色", "#c5d1e0"]] as const;
export function resolveHeroSettings(value: unknown): Record<string, string | number> {
 const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
 const result: Record<string, string | number> = {};
 for (const [key,,fallback,min,max] of heroNumberFields) {
  const n = raw[key]; result[key] = typeof n === "number" && Number.isFinite(n) ? Math.min(max,Math.max(min,n)) : fallback;
 }
 for (const [key,,fallback] of heroColorFields) result[key] = typeof raw[key] === "string" && /^#[0-9a-f]{6}$/i.test(raw[key]) ? raw[key] : fallback;
 result.font = ["sans", "serif"].includes(String(raw.font)) ? String(raw.font) : "sans";
 return result;
}
export function heroCssVariables(value: unknown): Record<string, string> {
 const settings = resolveHeroSettings(value);
 const result: Record<string, string> = {};
 for (const [key] of heroNumberFields) result[`--nav-${key}`] = `${settings[key]}px`;
 for (const [key] of heroColorFields) result[`--nav-${key}`] = String(settings[key]);
 result["--nav-heading-font"] = settings.font === "serif" ? '"Noto Serif TC", "PMingLiU", serif' : 'Inter, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", Arial, sans-serif';
 return result;
}
