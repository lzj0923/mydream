import { formToken, record } from "../app-admin/domain";

export type AcceptedEpisode = { id: string; projectId: string; episodeNumber: number; revision: number; title: string; description: string; vodVideoId: string; coverUrl: string };
export type DraftOperation = { projectId: string; submissionId: string; videoId: string; episodeId?: number; phase: "unknown" | "confirmed"; updatedAt: string };
export type DraftResult = { episodeId: number; dramaId: number; status: string; reused: boolean };
export class DraftError extends Error { status: number; constructor(message: string, status = 409) { super(message); this.status = status; } }
type Gateway = { get(route: string, html?: boolean): Promise<unknown>; post(route: string, body: URLSearchParams): Promise<unknown>; save(operation: DraftOperation): Promise<void> };
function field(html: string, name: string) {
  for (const input of html.match(/<input\b[^>]*>/gi) || []) {
    if (input.match(/\bname\s*=\s*["']([^"']*)["']/i)?.[1] === name) return input.match(/\bvalue\s*=\s*["']([^"']*)["']/i)?.[1] || "";
  }
  return "";
}

/** Creates only a draft through the original authenticated App admin action.
 * Uncertain writes are reconciled by reading, never blindly retried. */
export async function prepareAppDraft(gateway: Gateway, episode: AcceptedEpisode, dramaId: number, prior?: DraftOperation): Promise<DraftResult> {
  if (prior && prior.projectId !== episode.projectId) throw new DraftError("此 App 集數已由其他項目建立草稿");
  const query = new URLSearchParams({ offset: "0", limit: "2", sort: "id", order: "desc", filter: JSON.stringify({ drama_id: dramaId, drama_num: episode.episodeNumber }), op: JSON.stringify({ drama_id: "=", drama_num: "=" }) });
  async function existing() {
    const response = record(await gateway.get(`short/episode/index?${query}`));
    if (!Array.isArray(response.rows) || !Number.isFinite(Number(response.total))) throw new DraftError("App 劇集列表返回異常", 502);
    if (Number(response.total) > 1 || response.rows.length > 1) throw new DraftError("App 中存在重複集數，請先在原後台處理");
    if (!response.rows.length) return undefined;
    const row = record(response.rows[0]), id = Number(row.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new DraftError("App 劇集編號無效", 502);
    const html = String(await gateway.get(`short/episode/edit/ids/${id}`, true));
    if (Number(field(html, "row[drama_id]")) !== dramaId || Number(field(html, "row[drama_num]")) !== episode.episodeNumber) throw new DraftError("App 劇目或集數不一致，已停止操作");
    return { id, status: String(row.status), videoId: field(html, "row[video_attachment_id]"), html };
  }
  const found = await existing();
  const operation = (id?: number, phase: DraftOperation["phase"] = "confirmed"): DraftOperation => ({ projectId: episode.projectId, submissionId: episode.id, videoId: episode.vodVideoId, episodeId: id, phase, updatedAt: new Date().toISOString() });
  if (found?.videoId === episode.vodVideoId) {
    await gateway.save(operation(found.id));
    return { episodeId: found.id, dramaId, status: found.status, reused: true };
  }
  if (prior?.phase === "unknown") throw new DraftError("上次寫入結果尚未確認。請在 App 原後台核對，系統不會重複建立或覆蓋劇集。", 409);
  if (found && (found.status !== "draft" || !prior || prior.episodeId !== found.id || prior.videoId !== found.videoId)) throw new DraftError("本集已有其他視頻或已上架，請先在 App 原後台核對；僅可更新本流程建立且未被他人更換視頻的草稿。");
  const route = found ? `short/episode/edit/ids/${found.id}` : "short/episode/add";
  const html = found?.html || String(await gateway.get(`short/episode/add?drama_id=${dramaId}`, true));
  // A successful HTML response can still be a permission/login error page.
  if (!html.includes('row[video_attachment_id]') || !html.includes('row[drama_num]')) throw new DraftError("無法讀取 App 劇集表單，請確認管理員新增或編輯權限", 403);
  const params = new URLSearchParams({ "row[drama_id]": String(dramaId), "row[drama_num]": String(episode.episodeNumber), "row[title]": episode.title, "row[description]": episode.description, "row[thumbnail]": episode.coverUrl, "row[video_url]": `/vod/${episode.vodVideoId}`, "row[video_attachment_id]": episode.vodVideoId, "row[status]": "draft" });
  if (!found) { params.set("row[unlock_price]", "0.00"); params.set("row[likes]", "0"); }
  const token = formToken(html); if (token) params.set("__token__", token);
  await gateway.save(operation(found?.id, "unknown"));
  await gateway.post(route, params);
  const result = await existing();
  if (!result || result.videoId !== episode.vodVideoId || result.status !== "draft") throw new DraftError("App 寫入結果需人工核對，請勿重複建立劇集", 502);
  await gateway.save(operation(result.id));
  return { episodeId: result.id, dramaId, status: result.status, reused: false };
}
