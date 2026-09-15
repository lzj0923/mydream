import type {ProjectIssue} from "./creator-video/project-analytics-data";
import { record, safeMediaUrl } from "./creator-video/domain";

export type AnalyticsVideo = {
  id: string; title: string; coverUrl: string; status: string; publishedAt: string | null;
  views: number | null; likes: number | null; comments: number | null; collections: number | null;
};
export type Reward = { id: string; date: string; amount: string;dramaId?:number;episodeId?:number;attributionBasis?:string };
export type AnalyticsData = { projectIssues?:ProjectIssue[];videosUnavailable?:boolean;projectComplete?:boolean;projectCount?:number;projectIncomeAvailable?:boolean; videos: AnalyticsVideo[]; rewards: Reward[] | null; rewardsComplete: boolean; fans: number | null; complete: boolean; updatedAt: string; profileUnavailable: boolean };
export type Metric = "views" | "likes" | "comments" | "collections";
export function counter(value: unknown): number | null {
  if ((typeof value !== "number" && typeof value !== "string") || String(value).trim() === "") return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}
/** The App writes this exact memo for creator profit sharing. Translated descriptions are not a reliable category. */
export function rewardPage(value: unknown, ownerId: number) {
  const page = record(value);
  if (!Array.isArray(page.data) || counter(page.total) === null) throw new Error("收益流水格式異常");
  const rewards: Reward[] = [];
  for (const value of page.data) {
    const row = record(value);
    if (Number(row.user_id) !== ownerId) throw new Error("收益歸屬校驗失敗");
    if (String(row.type) !== "1" || !["創作者分潤獎勵", "创作者分润奖励"].includes(String(row.memo))) continue;
    const amount = String(row.score);
    if (!/^\d+(?:\.\d+)?$/.test(amount)) throw new Error("收益金額異常");
    const attributed=row.source_scope==="episode"&&counter(row.drama_id)!==null&&Number(row.drama_id)>0&&counter(row.episode_id)!==null&&Number(row.episode_id)>0&&typeof row.attribution_basis==="string"&&row.attribution_basis.trim();
    rewards.push({id:String(row.id),date:String(row.created_at || ""),amount,...(attributed?{dramaId:Number(row.drama_id),episodeId:Number(row.episode_id),attributionBasis:String(row.attribution_basis)}:{})});
  }
  return { rewards, count: page.data.length, total: counter(page.total)! };
}
export function sumRewards(rows: Reward[]): string {
  const scale = Math.max(0,...rows.map(r => r.amount.split(".")[1]?.length || 0));
  const total = rows.reduce((sum,r) => { const [a,b=""] = r.amount.split("."); return sum+BigInt(a+b.padEnd(scale,"0")); },BigInt(0));
  if (!scale) return String(total);
  const digits=String(total).padStart(scale+1,"0");
  return digits.slice(0,-scale)+"."+digits.slice(-scale);
}
export function analyticsRows(value: unknown, ownerId: number, assetBase: string): AnalyticsVideo[] {
  const data = record(value);
  const rows = Array.isArray(value) ? value : Array.isArray(data.list) ? data.list : Array.isArray(data.data) ? data.data : null;
  if (!rows) throw new Error("作品數據格式異常");
  return rows.map(value => {
    const row = record(value);
    if (Number(row.user_id) !== ownerId) throw new Error("作品數據歸屬校驗失敗");
    const id = Number(row.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new Error("作品編號異常");
    const seconds = Number(row.createtime);
    const date = Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : null;
    return {
      id: String(id), title: String(row.title || "未命名作品"), coverUrl: safeMediaUrl(row.cover_image, assetBase),
      status: String(row.status ?? ""), publishedAt: date && Number.isFinite(date.getTime()) ? date.toISOString() : null,
      views: counter(row.view_count), likes: counter(row.like_count), comments: counter(row.comment_count), collections: counter(row.collect_count),
    };
  });
}
export function totalMetric(rows: AnalyticsVideo[], metric: Metric): number | null {
  if (rows.some(row => row[metric] === null)) return null;
  const n = rows.reduce((sum,row) => sum + (row[metric] ?? 0),0);
  return Number.isSafeInteger(n) ? n : null;
}
export function filterVideos(rows: AnalyticsVideo[], days: number, search: string, now: number): AnalyticsVideo[] {
  const cutoff = days ? now - days * 86400000 : null;
  const query = search.trim().toLocaleLowerCase();
  return rows.filter(row => (!query || row.title.toLocaleLowerCase().includes(query)) &&
    (cutoff === null || (row.publishedAt !== null && Date.parse(row.publishedAt) >= cutoff && Date.parse(row.publishedAt) <= now)));
}
function dayKey(time: number) { return new Date(time + 8 * 3600000).toISOString().slice(0,10); }
/** Publication counts are not historical viewing counts. Group in the site's UTC+8 timezone. */
export function publicationSeries(rows: AnalyticsVideo[], now: number, days = 30) {
  const today = dayKey(now);
  const end = Date.parse(today + "T00:00:00+08:00");
  const buckets = Array.from({length:days},(_,i)=>({date:dayKey(end-(days-1-i)*86400000),count:0}));
  const positions = new Map(buckets.map((b,i)=>[b.date,i]));
  for(const row of rows) {
    if(!row.publishedAt) continue;
    const time=Date.parse(row.publishedAt);
    if(!Number.isFinite(time)||time>now)continue;
    const index=positions.get(dayKey(time));
    if(index!==undefined)buckets[index].count++;
  }
  return buckets;
}
export function csvCell(value: string | number | null): string {
  let text=value===null?"未提供":String(value);
  if(/^[\s]*[=+\-@]/.test(text))text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
}

export function projectEpisodeRow(ref:{episodeId:number;episodeNumber:number;projectTitle:string},value:unknown,assetBase:string):AnalyticsVideo{
 const row=record(value);if(Number(row.id)!==Number(ref.episodeId)||Number(row.drama_num)!==Number(ref.episodeNumber))throw new Error("項目劇集關聯不一致");
 return {id:`episode:${row.id}`,title:`${ref.projectTitle} · 第 ${ref.episodeNumber} 集 · ${String(row.title||"")}`,coverUrl:safeMediaUrl(row.thumbnail,assetBase),status:String(row.status||""),publishedAt:typeof row.created_at==="string"?row.created_at:null,views:counter(row.views),likes:counter(row.likes),comments:counter(row.comment_num),collections:null};
}
