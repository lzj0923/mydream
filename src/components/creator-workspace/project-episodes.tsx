"use client";
import {csvCell} from "@/lib/creator-analytics";
import {FilmEmpty} from "./workspace-panels";
import {useWorkType} from "./work-type";
import {ResumeEpisode} from "./resume-episode";
import {ContentRemoval} from "./content-removal";
import {useCompanyPermissions} from "./company-team";

import { useEffect, useState } from "react";
import { ChevronDown, CloudUpload, Film, LockKeyhole, RefreshCw } from "lucide-react";
import "./project-episodes.css";
import {episodeEditReason} from "@/lib/creator-video/project";
import {PublishEpisode} from "./publish-episode";

export type EpisodeSubmission = {
  id: string; projectId: string; projectTitle?: string; episodeNumber: number; revision: number;
  title: string; description: string; filename: string; vodVideoId: string; attachmentId: string;
  coverUrl: string; mediaUrl: string; state: "DRAFT" | "SUBMITTED" | "CHANGES_REQUESTED" | "APPROVED" | "ARCHIVED";
  note: string; reviewNote: string; version: number; updatedAt: string;
};
type Publication = { episodeNumber: number; submissionId: string; appDramaId: number; appEpisodeId: number; title: string; verifiedAt: string; checkStatus?:string;checkMessage?:string;checkedAt?:string };
const publicationLabel=(p:Publication)=>p.checkStatus==="MISSING"?"App 未返回劇集":p.checkStatus==="OFFLINE"?"已下架":p.checkStatus==="MISMATCH"?"內容不匹配":p.checkStatus==="UNAVAILABLE"?"上架異常":p.checkStatus==="UNKNOWN"?"待確認":p.checkStatus==="PUBLISHED"?"上次核對正常":"已關聯 · 待核對";
type Detail = {settings?:import("@/lib/creator-video/project-settings").ProjectSettings|null; id: string; stage: string; version: number; episodeCount: number; synopsis: string; body: string; publicationHistory?:{episodeNumber:number;appDramaId:number;appEpisodeId:number;status:string;message:string;actor:string;checkedAt:string}[]; submissions: EpisodeSubmission[]; publications: Publication[] };
export const episodeLabels = { DRAFT: "待提交", SUBMITTED: "待驗收", CHANGES_REQUESTED: "待修改", APPROVED: "已驗收", ARCHIVED: "已刪除 · 可重新上傳" };
export async function projectApi<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/creator/${path}`, { method: body === undefined ? "GET" : "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.detail || "項目服務暫時不可用"),{code:result.code});
  return result as T;
}

export function ProjectEpisodes({ projectId, admin, onProjectChanged }: { projectId: string; admin: boolean; onProjectChanged: () => void }) {
 const permissions=useCompanyPermissions();
  const [data, setData] = useState<Detail | null>(null), [error, setError] = useState("");
  const [episode, setEpisode] = useState(1), [revision, setRevision] = useState(0);
  const [pollRevision,setPollRevision]=useState(0);
  useEffect(()=>{
    const refresh=()=>{if(document.visibilityState==="visible")setPollRevision(value=>value+1);};
    const timer=setInterval(refresh,60000);document.addEventListener("visibilitychange",refresh);
    return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",refresh);};
  },[projectId]);
  const [manualBusy, setBusy] = useState(false), [result, setResult] = useState("");
  const [note, setNote] = useState("");
  const base = `${admin ? "project-reviews" : "projects"}/${projectId}`;
  useEffect(() => {
    let alive = true;
    projectApi<Detail>(`${base}/episodes`).then(value => { if (alive) { setData(value); setError(""); } }).catch(e => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [base, revision]);
  useEffect(()=>{if(!data)return;const select=()=>{const number=Number(new URLSearchParams(window.location.hash.split("?")[1]||"").get("episode"));if(Number.isInteger(number)&&number>=1&&number<=data.episodeCount)setEpisode(number);};select();window.addEventListener("hashchange",select);return()=>window.removeEventListener("hashchange",select);},[data]);
  const selectedPublication=data?.publications.find(item=>item.episodeNumber===episode);
  const selectedAssociation=selectedPublication?`${selectedPublication.submissionId}:${selectedPublication.appDramaId}:${selectedPublication.appEpisodeId}`:"";
  const [checkedAssociation,setCheckedAssociation]=useState("");
  const checkKey=`${base}:${episode}:${selectedAssociation}:${pollRevision}`;
  const busy=manualBusy || (!!selectedAssociation && checkedAssociation!==checkKey);
  useEffect(()=>{
    if(!selectedAssociation)return;
    let alive=true;
    projectApi(`${base}/publication-check?episodeNumber=${episode}`).then(()=>projectApi<Detail>(`${base}/episodes`)).then(value=>{if(alive){setData(value);setError("");}}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setCheckedAssociation(checkKey);});
    return()=>{alive=false;};
  },[base,episode,selectedAssociation,checkKey]);
  const reload = () => { setResult(""); setRevision(value => value + 1); };
  const changed = () => { reload(); onProjectChanged(); };
  if (!data) return <div className="cp-episodes"><p role="status">{error || "正在讀取逐集交付記錄…"}</p>{error && <button onClick={reload}>重試</button>}</div>;
  const latest = new Map<number, EpisodeSubmission>();
  for (const item of data.submissions) if (!latest.has(item.episodeNumber)) latest.set(item.episodeNumber, item);
  const versions = data.submissions.filter(item => item.episodeNumber === episode);
  const published = data.publications.find(item => item.episodeNumber === episode);
  const approved = [...latest.values()].filter(item => item.state === "APPROVED").length;
  const associated = data.publications.filter(item => latest.get(item.episodeNumber)?.id === item.submissionId && item.checkStatus === "PUBLISHED").length;
  const canUpload = permissions.canUpload && !episodeEditReason(data.stage,versions.map(item=>item.state),!!published);
  async function check() {
    setBusy(true); setResult(""); setError("");
    try {
      const values = await projectApi<{ status: string; message?: string }[]>(`${base}/publication-check?episodeNumber=${episode}`);
      const value = values[0];
      setRevision(value=>value+1); onProjectChanged();
      setResult(value?.status === "PUBLISHED" ? "剛剛核對：App 劇集已上架，視頻與本次交付一致。" : value?.status === "UNKNOWN" ? "暫時無法讀取 App，尚不能確認當前上架狀態。" : value?.message || "尚無已核對的 App 關聯。");
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function complete() {
    setBusy(true); setError("");
    try { await projectApi(`${base}/complete`, { note, version: data!.version }); changed(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <section className={`cp-episodes${!admin ? " cp-episodes--studio" : ""}`}>
    <div className="cp-head"><div><h3>劇集上傳</h3><p>選擇集數，上傳視頻並提交驗收</p></div><button disabled={busy} onClick={reload}><RefreshCw size={14}/>刷新進度</button></div>
    <div className="cp-episode-stats"><span>計畫集數<strong>{data.episodeCount}<small> 集</small></strong></span><span>已上傳<strong>{latest.size}<small> 集</small></strong></span><span>待驗收<strong>{[...latest.values()].filter(item=>item.state==="SUBMITTED").length}<small> 集</small></strong></span><span>已驗收<strong>{approved}<small> 集</small></strong></span><span>核對正常<strong>{associated}<small> 集</small></strong></span></div>
    <details className="cp-script"><summary>查看項目簡介</summary><p>{data.synopsis}</p><pre>{data.body}</pre></details>
    <div className="cp-episode-grid" role="group" aria-label="選擇劇集">{Array.from({length:data.episodeCount},(_,i)=>{
      const number=i+1,item=latest.get(number),isPublished=data.publications.find(p=>p.episodeNumber===number);
      const status=isPublished?publicationLabel(isPublished):item?episodeLabels[item.state]:"未上傳";
      return <button type="button" key={number} aria-pressed={episode===number} className={`cp-episode-tile${episode===number?" is-selected":""}`} disabled={busy} onClick={()=>{setEpisode(number);setResult("");}}><Film size={17}/><strong>第 {number} 集</strong><small data-state={isPublished?"APPROVED":item?.state??"EMPTY"}>{status}</small></button>;
    })}</div>
    {!admin && <div className="cp-upload-entry"><span className="cp-upload-symbol">{canUpload?<CloudUpload size={30}/>:<LockKeyhole size={27}/>}</span><div><h4>第 {episode} 集 · {published?publicationLabel(published):versions.length?episodeLabels[versions[0].state]:"等待上傳"}</h4><p>{canUpload?"上傳視頻、設定封面，完成後提交平台驗收。":published?"本集保留已有 App 關聯；如狀態異常，請由平台核對處理。":episodeEditReason(data.stage,versions.map(item=>item.state),!!published)}</p></div>{canUpload&&<a href={`#videos?project=${encodeURIComponent(projectId)}&episode=${episode}`}><CloudUpload size={17}/>{versions.length?"上傳新版本":"上傳本集視頻"}</a>}</div>}
    {published && <div className="cp-linked"><h4>App 關聯記錄 · {publicationLabel(published)}</h4><p>劇目 ID：{published.appDramaId} · 劇集 ID：{published.appEpisodeId} · 對應 V{data.submissions.find(item => item.id === published.submissionId)?.revision}</p><p>核對時間：{new Date(published.verifiedAt).toLocaleString("zh-TW")}。此為歷史上架記錄。</p>{published.checkedAt&&<p role="status">最近檢查：{new Date(published.checkedAt).toLocaleString("zh-TW")} · {published.checkMessage}</p>}{["UNAVAILABLE","MISSING","OFFLINE","MISMATCH"].includes(published.checkStatus||"")&&<p className="cp-error">請由平台核對 App 上架狀態及編號；保留交付稿與歷史記錄，不代表視頻文件已刪除。</p>}{published.submissionId !== latest.get(episode)?.id && <p>此關聯屬於歷史版本，最新修改稿尚未完成上架核對。</p>}<button disabled={busy} onClick={() => void check()}>{busy?"正在核對 App…":"重新核對 App 狀態"}</button></div>}
    {!!data.publicationHistory?.length&&<details className="cp-script"><summary>上架核對日誌（最近 100 條）</summary>{data.publicationHistory.map((entry,index)=><p key={index}>{new Date(entry.checkedAt).toLocaleString("zh-TW")} · 第 {entry.episodeNumber} 集 · 劇目 {entry.appDramaId} / 劇集 {entry.appEpisodeId}<br/>{entry.message}<br/>{admin?`操作人：${entry.actor}`:""}</p>)}</details>}
    {admin&&published&&published.checkStatus==="MISSING"&&<button disabled={busy} onClick={async()=>{setBusy(true);setError("");try{const r=await fetch("/api/app-admin/project-deletion",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({projectId,episodeNumber:episode})});const d=await r.json();if(!r.ok)throw Error(d.message||"核對失敗");changed();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>核對刪除並解鎖本集</button>}
    {result && <p className="cp-guidance" role="status">{result}</p>}
    {error && <p className="cp-error" role="alert">{error}</p>}
    {!versions.length && admin && <p className="cp-empty">第 {episode} 集尚未上傳視頻。</p>}
    {versions.map((item, index) => <Submission key={`${item.id}-${item.version}`} item={item} admin={admin} latest={index === 0} producing={data.stage === "PRODUCING" || (admin && data.stage === "COMPLETED")} settings={data.settings} publication={data.publications.find(p=>p.submissionId===item.id)} base={base} existingDramaId={data.publications[0]?.appDramaId} onChanged={changed} />)}
    {admin && data.stage === "PRODUCING" && <div className="cp-action"><label>項目完成說明<textarea value={note} onChange={e => setNote(e.target.value)} maxLength={1000} disabled={busy} /></label><button disabled={busy || !note.trim() || associated !== data.episodeCount || approved !== data.episodeCount} onClick={() => void complete()}>完成項目</button><p>全部承諾集數的最新稿驗收通過並核對 App 關聯後，可記錄項目完成。</p></div>}
  </section>;
}

function Submission({ item, admin, latest, producing, publication, settings, base, existingDramaId, onChanged }: { item: EpisodeSubmission; admin: boolean; latest: boolean; producing: boolean; publication?:Publication; settings?:import("@/lib/creator-video/project-settings").ProjectSettings|null; base: string; existingDramaId?: number; onChanged: () => void }) {
  const permissions=useCompanyPermissions();
  const [note, setNote] = useState(item.note||"提交本集視頻與封面"), [dramaId, setDramaId] = useState(String(existingDramaId || "")), [episodeId, setEpisodeId] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function action(path: string, body: unknown) {
    setBusy(true); setError("");
    try { await projectApi(`${base}/episodes/${item.id}/${path}`, body); onChanged(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  function download() {
    const content = JSON.stringify({ projectId: item.projectId, episodeNumber: item.episodeNumber, revision: item.revision, title: item.title, description: item.description, coverUrl: item.coverUrl, videoAttachmentId: item.vodVideoId, attachmentId: item.attachmentId, videoUrl: item.mediaUrl }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: "application/json;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `episode-${item.episodeNumber}-v${item.revision}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <details className="cp-submission" open={latest}><summary className="cp-head"><h4>第 {item.episodeNumber} 集 · V{item.revision} · {item.title}</h4><span className="cp-stage">{publication?publicationLabel(publication):episodeLabels[item.state]}{!latest && " · 歷史版本"}</span><ChevronDown className="cp-submission-chevron" size={18} aria-hidden="true"/></summary><div className="cp-submission-body"><p>{item.description}</p>
    {item.mediaUrl && <video src={item.mediaUrl} poster={item.coverUrl} controls preload="none" playsInline />}
    <p>交付說明：{item.note || "尚未提交"}</p>{item.reviewNote && <p className="cp-guidance">平台驗收意見：{item.reviewNote}</p>}
    {item.state === "DRAFT" && <p>尚未提交驗收，可在下方繼續完成本稿。</p>}
    {!admin && (permissions.canSubmit||permissions.canUpload) && latest && producing && (item.state==="DRAFT"||item.state==="CHANGES_REQUESTED") && <ResumeEpisode item={item} onChanged={onChanged}/>}
    {admin && item.state === "SUBMITTED" && <div className="cp-action"><label>驗收意見<textarea value={note} onChange={e => setNote(e.target.value)} maxLength={1000} disabled={busy} /></label><div className="cp-buttons"><button disabled={busy || !note.trim()} onClick={() => void action("review", { decision: "APPROVED", note, version: item.version })}>驗收通過</button><button disabled={busy || !note.trim()} onClick={() => void action("review", { decision: "CHANGES_REQUESTED", note, version: item.version })}>退回修改</button></div></div>}
    {admin && latest && producing && item.state === "APPROVED" && <PublishEpisode recovery={!!publication} settings={settings} item={item} existingDramaId={existingDramaId} onChanged={onChanged}/>}
    {admin && latest && item.state === "APPROVED" && <details className="cp-publish"><summary>匯出交付資料與記錄上架結果</summary><p>驗收通過後，可下載本集資料，在 App 劇集管理中建立劇集、設定價格並上架，再回到此處核對及保存上架編號。</p><dl><dt>集數</dt><dd>{item.episodeNumber}</dd><dt>VOD 視頻 ID</dt><dd>{item.vodVideoId}</dd><dt>附件 ID</dt><dd>{item.attachmentId}</dd><dt>視頻地址</dt><dd>{item.mediaUrl}</dd><dt>封面地址</dt><dd>{item.coverUrl}</dd></dl><button onClick={download}>下載本集上架資料</button><div className="cp-action"><label>App 劇目 ID<input type="number" min={1} step={1} value={dramaId} disabled={busy} onChange={e => setDramaId(e.target.value)} /></label><label>App 劇集 ID<input type="number" min={1} step={1} value={episodeId} disabled={busy} onChange={e => setEpisodeId(e.target.value)} /></label><button disabled={busy || !Number.isSafeInteger(Number(dramaId)) || Number(dramaId) < 1 || !Number.isSafeInteger(Number(episodeId)) || Number(episodeId) < 1} onClick={() => void action("publication", { dramaId: Number(dramaId), episodeId: Number(episodeId), version: item.version })}>{busy ? "正在核對 App…" : "核對並保存 App 關聯"}</button></div></details>}
    {!admin && item.state!=="ARCHIVED" && <ContentRemoval projectId={item.projectId} submissionId={item.id} revision={item.version} onChanged={onChanged}/>}
    {error && <p className="cp-error" role="alert">{error}<button onClick={onChanged} disabled={busy}>重新讀取</button></p>}
  </div></details>;
}

export function ProjectVideoList({ active, revision, onUpload }: { active: boolean; revision: number; onUpload?:()=>void }) {
  const permissions=useCompanyPermissions(),{workType}=useWorkType();
  const [rows,setRows]=useState<EpisodeSubmission[]>([]),[error,setError]=useState(""),[loading,setLoading]=useState(true);
  const [search,setSearch]=useState(""),[status,setStatus]=useState("ALL"),[reload,setReload]=useState(0);
  useEffect(()=>{if(!active)return;let alive=true;setLoading(true);projectApi<EpisodeSubmission[]>("project-episodes").then(value=>{if(alive){setRows(value);setError("");}}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[active,revision,reload]);
  const visible=rows.filter(r=>(status==="ALL"||r.state===status)&&`${r.projectTitle} ${r.title} ${r.id}`.toLowerCase().includes(search.trim().toLowerCase()));
  function exportRows(){const values=[["項目","視頻","集數","版本","驗收狀態","更新時間"],...visible.map(r=>[r.projectTitle||"",r.title,r.episodeNumber,r.revision,episodeLabels[r.state],r.updatedAt])];const url=URL.createObjectURL(new Blob(["\ufeff"+values.map(r=>r.map(csvCell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="項目視頻交付記錄.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return <section className="cw-card rp-panel rp-videos"><header className="rp-heading"><h1>{workType==="COMIC"?"漫劇":"短劇"} · 視頻管理</h1><button className="rp-text" disabled={loading} onClick={()=>setReload(v=>v+1)}>刷新記錄</button></header><div className="rp-toolbar"><label className="rp-search"><input aria-label="搜索項目視頻" value={search} onChange={e=>setSearch(e.target.value)} placeholder="輸入項目、視頻名稱或編號"/></label><select aria-label="驗收狀態" value={status} onChange={e=>setStatus(e.target.value)}><option value="ALL">全部驗收狀態</option>{Object.entries(episodeLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><div className="rp-toolbar-actions"><a className="cw-outline" href="#help">使用指南</a><button className="cw-outline" disabled={!visible.length||loading||!!error} onClick={exportRows}>導出記錄</button>{permissions.canUpload&&onUpload&&<button className="cw-primary" onClick={onUpload}>上傳視頻</button>}</div></div><div className="rp-table-wrap"><table className="rp-table"><thead><tr>{["劇集信息","所屬項目","集數 / 版本","驗收狀態","更新時間","操作"].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{!error&&visible.map(r=><tr key={r.id}><td><div className="rp-work"><span className="rp-cover">{r.coverUrl?<img src={r.coverUrl} alt=""/>:<Film size={21}/>}</span><div><strong>{r.title||`第 ${r.episodeNumber} 集`}</strong><small>ID：{r.id}</small></div></div></td><td>{r.projectTitle||"—"}</td><td>第 {r.episodeNumber} 集 · V{r.revision}</td><td><span className={`rp-status ${r.state==="APPROVED"?"is-success":""}`}>{episodeLabels[r.state]}</span></td><td>{r.updatedAt?new Date(r.updatedAt).toLocaleString("zh-TW"):"—"}</td><td><a className="rp-link" href={`#projects?project=${encodeURIComponent(r.projectId)}`}>查看項目</a></td></tr>)}</tbody></table></div>{loading?<FilmEmpty title="正在讀取視頻記錄…"/>:error?<FilmEmpty title={error}><button onClick={()=>setReload(v=>v+1)}>重新讀取</button></FilmEmpty>:!visible.length?<FilmEmpty title={rows.length?"沒有符合條件的視頻":"暫無視頻交付記錄"}/>:<p className="rp-footnote">共 {visible.length} 條交付記錄 · 驗收狀態不代表 App 當前上架狀態，上架情況請在項目中查看。</p>}</section>;
}
