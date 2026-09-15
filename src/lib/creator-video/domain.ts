export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
export const MAX_COVER_BYTES = 5 * 1024 * 1024;
export type VideoMetadata = { title: string; description: string; filename: string; size: number };
export type CreatorVideo = { id: string; title: string; description: string; coverUrl: string; videoUrl: string; status: string; views: number; durationSeconds: number };

export function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function videoMetadata(input: unknown): VideoMetadata {
  const data = record(input);
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  const filename = typeof data.filename === "string" ? data.filename : "";
  const size = Number(data.size);
  if (!title || title.length > 128) throw new Error("視頻標題須為 1–128 個字符");
  if (description.length > 2000) throw new Error("視頻簡介不能超過 2000 個字符");
  if (filename.length > 180 || /[\\/\x00-\x1f]/.test(filename) || !/\.(mp4|mov|webm)$/i.test(filename)) throw new Error("請選擇 MP4、MOV 或 WebM 視頻");
  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_VIDEO_BYTES) throw new Error("視頻大小須在 500 MB 以內，且不能為空");
  return { title, description, filename, size };
}
export function safeMediaUrl(value: unknown, assetBase: string): string {
  if (typeof value !== "string" || !value || value.startsWith("/vod/")) return "";
  try {
    const url = new URL(value, assetBase);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}
export function videoList(value: unknown, assetBase: string): CreatorVideo[] {
  const data = record(value);
  const list = Array.isArray(value) ? value : Array.isArray(data.data) ? data.data : Array.isArray(data.list) ? data.list : null;
  if (!list) throw new Error("作品列表返回異常，請稍後重試");
  return list.map(item => {
    const row = record(item);
    return {
      id: String(row.id ?? ""), title: String(row.title ?? "未命名視頻"), description: String(row.description ?? ""),
      coverUrl: safeMediaUrl(row.cover_image ?? row.coverUrl, assetBase),
      videoUrl: safeMediaUrl(row.video_url ?? row.videoUrl ?? row.video_file, assetBase),
      status: String(row.status ?? ""), views: Number(row.view_count) || 0, durationSeconds: Number(row.duration) || 0,
    };
  }).filter(item => item.id);
}
export function coverMime(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if ([137,80,78,71,13,10,26,10].every((value, i) => bytes[i] === value)) return "image/png";
  const text = (start: number, end: number) => String.fromCharCode(...bytes.slice(start,end));
  return text(0,4) === "RIFF" && text(8,12) === "WEBP" ? "image/webp" : null;
}
