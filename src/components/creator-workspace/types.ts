export type ScriptStatus = "ACTIVE" | "DRAFT" | "SUBMITTED" | "APPROVED" | "CHANGES_REQUESTED";
export type CreatorScript = {
  id: string; title: string; genre: string; format: string; episodeCount: number;
  synopsis: string; body?: string; status: ScriptStatus; reviewNote: string; version: number;
  createdAt: string; updatedAt: string; submittedAt: string | null; ownerKey?: string;
};
export type CreatorProfile = { displayName: string; bio: string; specialty: string };
export type IpInterest = { id: string; workSlug: string; workTitle: string; format: string; proposal: string; status: "PENDING" | "CONTACTING" | "DECLINED"; reviewNote: string; createdAt: string };
export type WorkspaceData = { viewer: { name: string; admin: boolean }; profile: CreatorProfile; scripts: CreatorScript[]; interests: IpInterest[]; favorites: string[] };
export type CatalogWork = { id: string; title: string; slug: string; coverUrl: string; genre: string; episodes: number; heat: number };
export const statusLabels: Record<ScriptStatus, string> = { ACTIVE: "創作中", DRAFT: "草稿", SUBMITTED: "審核中", APPROVED: "已通過", CHANGES_REQUESTED: "待修改" };
export const genres = ["都市情感", "悬疑推理", "古装传奇", "奇幻冒险", "青春成长", "轻喜剧", "其他"];
export const formats = ["漫剧", "短剧"];

// Keep stored option values compatible with existing scripts; display Traditional Chinese labels.
const optionLabels: Record<string, string> = {
  [genres[1]]: "懸疑推理", [genres[2]]: "古裝傳奇", [genres[3]]: "奇幻冒險",
  [genres[4]]: "青春成長", [genres[5]]: "輕喜劇",
  "漫剧": "漫劇", "短剧": "短劇", "真人短剧": "短劇", "AI 短剧": "漫劇", "动画短剧": "動畫短劇",
  "悬疑": "懸疑",
};
export const creatorOptionLabel = (value: string) => optionLabels[value] ?? value;

export function scriptStats(scripts: CreatorScript[]) {
  return {
    total: scripts.length,
    submitted: scripts.filter((s) => s.status !== "DRAFT" && s.status !== "ACTIVE").length,
    reviewing: scripts.filter((s) => s.status === "SUBMITTED").length,
    approved: scripts.filter((s) => s.status === "APPROVED").length,
    drafts: scripts.filter((s) => s.status === "DRAFT" || s.status === "CHANGES_REQUESTED").length,
  };
}
