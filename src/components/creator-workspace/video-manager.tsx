"use client";
import {useCompanyPermissions} from "./company-team";

import Image from "next/image";
import {videoAccessNotice} from "@/lib/creator-video/access-state";
import { ProjectMaterials, type MaterialsHandle } from "./project-materials";
import { VideoDuration } from "./video-duration";
import { ProjectVideoList, projectApi } from "./project-episodes";
import { projectUpload, episodeEditReason } from "@/lib/creator-video/project";
import { submitWhenProcessed } from "@/lib/creator-video/processing";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Check, CheckCircle2, Film, ImagePlus, Pause, Play, Plus, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { MAX_COVER_BYTES, MAX_VIDEO_BYTES, videoMetadata, type CreatorVideo } from "@/lib/creator-video/domain";

type Credentials = { uploadId: string; userId: number; uploadAuth: string; uploadAddress: string; videoId: string; region: string };
type Uploader = {
  addFile(file: File, endpoint: null, bucket: null, object: null, data: string): void;
  startUpload(): void; stopUpload(): void; cancelFile(index: number): void;
  setUploadAuthAndAddress(info: unknown, auth: string, address: string, id: string): void;
  resumeUploadWithAuth(auth: string): void;
};
type UploadOptions = {
  userId: string; region: string; partSize: number; parallel: number; retryCount: number; retryDuration: number; localCheckpoint: boolean;
  onUploadstarted(info: unknown): void; onUploadSucceed(): void; onUploadFailed(): void;
  onUploadProgress(info: unknown, size: number, progress: number): void; onUploadTokenExpired(): void;
};
type Sdk = { Vod: new (options: UploadOptions) => Uploader };
let sdkLoading: Promise<Sdk> | null = null;
async function loadSdk(): Promise<Sdk> {
  const current = (window as unknown as { AliyunUpload?: Sdk }).AliyunUpload;
  if (current) return current;
  if (!sdkLoading) sdkLoading = (async () => {
    for (const name of ["aliyun-oss-sdk-6.17.1.min.js", "aliyun-upload-sdk-1.5.7.min.js"]) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `/vendor/aliyun-vod/${name}`; script.onload = () => resolve();
        script.onerror = () => { script.remove(); reject(new Error("上傳組件加載失敗，請刷新頁面重試")); };
        document.head.appendChild(script);
      });
    }
    const sdk = (window as unknown as { AliyunUpload?: Sdk }).AliyunUpload;
    if (!sdk) throw new Error("上傳組件暫時不可用");
    return sdk;
  })().catch(error => { sdkLoading = null; throw error; });
  return sdkLoading;
}
async function videoApi<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const form = body instanceof FormData;
  const response = await fetch(`/api/creator-videos${path}`, {
    method, cache: "no-store", headers: form ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : form ? body : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.message || "視頻服務暫時不可用"), { status: response.status,code:result.code });
  return result as T;
}
type Phase = "idle" | "preparing" | "uploading" | "paused" | "uploaded" | "processing" | "publishing" | "published" | "saved";
const phaseLabels: Record<Phase, string> = { processing: "視頻已上傳，雲端處理中，完成後自動提交", saved: "視頻已保存，等待有提交權限的成員送審", idle: "選擇視頻和封面後開始上傳", preparing: "正在準備上傳", uploading: "視頻上傳中", paused: "上傳已暫停，可重試繼續", uploaded: "視頻上傳完成，等待發布", publishing: "正在提交作品，請勿關閉頁面", published: "作品已提交到 App" };

export function VideoManager({ active }: { active: boolean }) {
 const permissions=useCompanyPermissions();
  const [step, setStep] = useState(1);
  const materials = useRef<MaterialsHandle>(null);
  const [savingMaterials, setSavingMaterials] = useState(false);
  const uploadForm = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!active) return;
    const frame = requestAnimationFrame(() => uploadForm.current?.scrollIntoView({ block: "start", behavior: "instant" }));
    return () => cancelAnimationFrame(frame);
  }, [active, step]);
  const [projects, setProjects] = useState<{ id: string; title: string; stage: string }[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true), [projectsError, setProjectsError] = useState(""), [projectsReload, setProjectsReload] = useState(0);
  const [projectId, setProjectId] = useState(""), [episodeNumber, setEpisodeNumber] = useState(1), [episodeCount, setEpisodeCount] = useState(0);
  const [episodeSubmissions,setEpisodeSubmissions]=useState<{episodeNumber:number;state:string}[]>([]);
  const episodeState=episodeSubmissions.filter(item=>item.episodeNumber===episodeNumber);
  const episodeLockReason=!projectId?"":episodeEditReason(episodeCount?(projects.find(item=>item.id===projectId)?.stage||"PRODUCING"):"UNKNOWN",episodeState.map(item=>item.state));
  const episodeEditingLocked=!!episodeLockReason;
  const [deliveryNote, setDeliveryNote] = useState(""), [projectRevision, setProjectRevision] = useState(0), [projectError, setProjectError] = useState("");
  const [file, setFile] = useState<File | null>(null), [cover, setCover] = useState<File | null>(null);
  const [title, setTitle] = useState(""), [description, setDescription] = useState("");
  const [phase, setPhase] = useState<Phase>("idle"), [progress, setProgress] = useState(0);
  const [error, setError] = useState(""), [listError, setListError] = useState("");
  const [items, setItems] = useState<CreatorVideo[]>([]), [page, setPage] = useState(1), [hasMore, setHasMore] = useState(false);
  const [accessCode,setAccessCode]=useState("");
  const accessNotice=videoAccessNotice(accessCode);
  const [viewer, setViewer] = useState<number | null>(null), [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<CreatorVideo | null>(null);
  const [deleting, setDeleting] = useState(false), [deleteError, setDeleteError] = useState("");
  const deleteDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (deleteTarget) deleteDialog.current?.showModal(); }, [deleteTarget]);
  const uploader = useRef<Uploader | null>(null), credentials = useRef<Credentials | null>(null);
  const coverSaved = useRef<File | null>(null), fileInput = useRef<HTMLInputElement>(null), coverInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(true), lastQuery = useRef(0);
  const submittingUpload = useRef<string | null>(null), submittedUpload = useRef<string | null>(null);
  const processingController = useRef<AbortController|null>(null);
  const preview = useMemo(() => file ? URL.createObjectURL(file) : "", [file]);
  const coverPreview = useMemo(() => cover ? URL.createObjectURL(cover) : "", [cover]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => { if (coverPreview) URL.revokeObjectURL(coverPreview); }, [coverPreview]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; processingController.current?.abort(); uploader.current?.stopUpload(); }; }, []);
  const refresh = useCallback(async (targetPage = 1) => {
    if(permissions.member){setLoading(false);return;}
    const query = ++lastQuery.current;
    setLoading(true); setListError("");
    try {
      const data = await videoApi<{ items: CreatorVideo[]; hasMore: boolean; userId: number }>(`?page=${targetPage}`);
      if (mounted.current && query === lastQuery.current) { setItems(data.items); setHasMore(data.hasMore); setPage(targetPage);setAccessCode(""); setViewer(data.userId); }
    } catch (e) {
      if (mounted.current && query === lastQuery.current) {
        const issue = e as Error & { status?: number;code?:string };
        setListError(issue.message);setAccessCode(issue.code||""); if (issue.status === 401) setViewer(null);
      }
    } finally { if (mounted.current && query === lastQuery.current) setLoading(false); }
  }, [permissions.member]);
  useEffect(() => { if (active) { const timer = setTimeout(() => { void refresh(); }, 0); return () => clearTimeout(timer); } }, [active, refresh]);
  useEffect(() => {
    if (phase === "idle" || phase === "published" || phase === "saved") return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [phase]);
  const busy = ["preparing", "uploading", "processing", "publishing"].includes(phase);
  useEffect(() => {
    if (!active) return;
    let alive = true;
    projectApi<{ id: string; title: string; stage: string }[]>("projects").then(value => { if (alive) { setProjects(value); setProjectsError(""); } }).catch(e => { if (alive) setProjectsError(e.message); }).finally(() => { if (alive) setProjectsLoading(false); });
    return () => { alive = false; };
  }, [active, projectsReload]);
  useEffect(() => {
    if (!active) return;
    const apply = () => {
      const [section, search] = location.hash.slice(1).split("?");
      const params = new URLSearchParams(search), id = params.get("project");
      if (section !== "videos" || !id) return;
      const number = Number(params.get("episode") || 1);
      if (phase !== "idle") { if (id !== projectId || number !== episodeNumber) setError("請先完成或取消當前上傳，再切換項目和集數。"); return; }
      if (id !== projectId || number !== episodeNumber) setStep(1);
      setProjectId(id); setEpisodeNumber(number);
    };
    const timer = setTimeout(apply, 0); window.addEventListener("hashchange", apply);
    return () => { clearTimeout(timer); window.removeEventListener("hashchange", apply); };
  }, [active, phase, projectId, episodeNumber]);
  useEffect(() => {
    if (!active || !projectId) return;
    let alive = true;
    projectApi<{ episodeCount: number; stage: string; submissions:{episodeNumber:number;state:string}[];publications?:{episodeNumber:number}[] }>(`projects/${encodeURIComponent(projectId)}/episodes`).then(value => { if (alive) { setEpisodeCount(value.episodeCount);setEpisodeSubmissions([...value.submissions,...(value.publications??[]).map(item=>({episodeNumber:item.episodeNumber,state:"PUBLISHED"}))]); setProjectError(value.stage === "PRODUCING" ? "" : "本項目目前不可上傳，請返回項目查看進度。"); } }).catch(e => { if (alive) { setEpisodeCount(0); setProjectError(e.message); } });
    return () => { alive = false; };
  }, [active, projectId, projectsReload,projectRevision]);

  async function start() {
    if(!permissions.canUpload || (!projectId)){setError("請選擇公司項目並確認上傳權限");return;}
    if (!file || !cover) { setError("請選擇視頻文件和封面圖片"); return; }
    setError(""); setPhase("preparing");
    try {
      const metadata = videoMetadata({ title, description, filename: file.name, size: file.size });
      const project = projectUpload(projectId ? { projectId, episodeNumber } : {});
      if (project && episodeEditingLocked) throw new Error(`本集${episodeLockReason}，不可重複上傳。`);
      if (project && (projectError || !episodeCount || episodeNumber > episodeCount)) throw new Error(projectError || "請選擇承諾範圍內的集數");
      const sdk = await loadSdk();
      const auth = credentials.current ?? await videoApi<Credentials>("/uploads", "POST", { ...metadata, ...project });
      credentials.current = auth;
      if (!mounted.current) return;
      uploader.current = new sdk.Vod({
        userId: String(auth.userId), region: auth.region, partSize: 2 * 1024 * 1024, parallel: 3, retryCount: 3, retryDuration: 2, localCheckpoint: false,
        onUploadstarted(info) { uploader.current?.setUploadAuthAndAddress(info, auth.uploadAuth, auth.uploadAddress, auth.videoId); if (mounted.current) setPhase("uploading"); },
        onUploadProgress(_info, _size, value) { if (mounted.current) setProgress(Math.min(100, Math.ceil(value * 100))); },
        onUploadSucceed() { if (mounted.current) { setProgress(100); setError(""); if (projectId) void submitUploaded(); else setPhase("uploaded"); } },
        onUploadFailed() { if (mounted.current) { setPhase("paused"); setError("上傳未完成，請檢查網絡後重試；如持續失敗，請聯繫平台"); } },
        onUploadTokenExpired() {
          void videoApi<Credentials>(`/uploads/${auth.uploadId}/refresh`, "POST").then(value => {
            if (mounted.current) { credentials.current = { ...auth, ...value }; uploader.current?.resumeUploadWithAuth(value.uploadAuth); }
          }).catch(e => { if (mounted.current) { setError((e as Error).message); setPhase("paused"); uploader.current?.stopUpload(); } });
        },
      });
      uploader.current.addFile(file, null, null, null, '{"Vod":{}}');
      uploader.current.startUpload();
    } catch (e) { if (mounted.current) { uploader.current?.stopUpload(); credentials.current = null; setError((e as Error).message); setPhase("idle"); } }
  }
  function pause() { uploader.current?.stopUpload(); setPhase("paused"); }
  function resume() { if(episodeEditingLocked)return; setError(""); setPhase("uploading"); uploader.current?.startUpload(); }
  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== 3) return;
    if (busy) return;
    if (phase === "idle") { await start(); return; }
    if (phase !== "uploaded" || !credentials.current || !cover) return;
    await submitUploaded();
  }
  async function submitUploaded() {
    const uploadId = credentials.current?.uploadId;
    if (!uploadId || !cover || submittingUpload.current === uploadId || submittedUpload.current === uploadId) return;
    submittingUpload.current = uploadId;
    const controller=new AbortController();processingController.current=controller;
    setPhase("publishing"); setError("");
    try {
      const path = `/uploads/${uploadId}`;
      if (coverSaved.current !== cover) {
        const form = new FormData(); form.set("file", cover);
        await videoApi(`${path}/cover`, "POST", form); coverSaved.current = cover;
      }
      const submit=()=>videoApi(`${path}/${projectId ? (permissions.canSubmit?"delivery":"draft") : "publish"}`, "POST", { title, description, note: deliveryNote.trim() || "提交本集視頻與封面" });
      if(projectId)await submitWhenProcessed(submit,{signal:controller.signal,onWaiting:()=>{if(mounted.current)setPhase("processing");}});
      else await submit();
      submittedUpload.current = uploadId;
      if (mounted.current) { setPhase(permissions.canSubmit?"published":"saved");if(projectId)setEpisodeSubmissions(items=>[...items,{episodeNumber,state:permissions.canSubmit?"SUBMITTED":"DRAFT"}]); setProjectRevision(value => value + 1); void refresh(); }
    } catch (e) { if (mounted.current) { setError(`視頻已上傳，提交未完成：${(e as Error).message}。請重試提交，無需重新上傳視頻。`); setPhase("uploaded"); } }
    finally { if(processingController.current===controller)processingController.current=null; if (submittingUpload.current === uploadId) submittingUpload.current = null; }
  }
  async function deleteVideo() {
    if (!deleteTarget || deleting) return;
    setDeleting(true); setDeleteError("");
    try {
      await videoApi(`/${encodeURIComponent(deleteTarget.id)}/delete`, "POST", {});
      setItems(current => current.filter(item => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      await refresh(items.length === 1 && page > 1 ? page - 1 : page);
    } catch (e) { setDeleteError((e as Error).message); }
    finally { setDeleting(false); }
  }
  function reset() {
    setStep(1);
    uploader.current?.stopUpload(); uploader.current = null; credentials.current = null; coverSaved.current = null;
    setFile(null); setCover(null); setTitle(""); setDescription(""); setDeliveryNote(""); setProgress(0); setError(""); setPhase("idle");
    if (fileInput.current) fileInput.current.value = "";
    if (coverInput.current) coverInput.current.value = "";
  }
  function chooseFile(value: File | null) {
    if (!value) return;
    try {
      videoMetadata({ title: value.name.replace(/\.[^.]+$/, "").slice(0,128), filename: value.name, size: value.size });
      credentials.current = null; coverSaved.current = null; setProgress(0);
      setFile(value); if (!title.trim()) setTitle(value.name.replace(/\.[^.]+$/, "").slice(0,128)); setError("");
    } catch (e) { setError((e as Error).message); if (fileInput.current) fileInput.current.value = ""; }
  }
  return <div className="cw-video-manager" style={active ? undefined : { display: "none" }}>
    
    {!viewer && !permissions.member ? <section className="cw-card cw-video-login"><Film size={32} /><h2>{loading ? "正在連接視頻服務" : accessNotice.title}</h2><p>{listError || "正在確認賬號連接狀態…"}</p>{!loading&&accessNotice.action&&<a className="cw-primary" href={accessNotice.href}>{accessNotice.action}</a>}<button className="cw-primary" disabled={loading} onClick={() => void refresh()}>{loading?"連接中…":"重新連接"}</button></section> : permissions.canUpload?<form data-upload-busy={["uploading","paused","processing","publishing"].includes(phase)} ref={uploadForm} className="cw-card cw-video-form" onSubmit={publish}>
      <div className="cw-card-title cw-upload-title"><a href={projectId ? `#projects?project=${encodeURIComponent(projectId)}` : "#projects"}><ArrowLeft size={17}/></a><h1 className="cw-page-title">{projectId ? `上傳第 ${episodeNumber} 集` : "上傳視頻"}</h1></div>
      <ol className="cw-upload-steps">{["填寫基本資料","上傳視頻","確認並提交","提交完成"].map((label,i)=><li key={label} aria-current={((phase==="published"||phase==="saved")?4:step)===i+1?"step":undefined} className={((phase==="published"||phase==="saved")?4:step)>=i+1?"is-current":""}><span>{((phase==="published"||phase==="saved")?4:step)>i+1?<Check size={13}/>:i+1}</span>{label}</li>)}</ol>
      <div style={{display:step===1?undefined:"none"}}>
      <section className="cu-context-card" aria-label="上傳歸屬">
        <header className="cu-context-header"><div className="cu-context-title"><span className="cu-context-icon"><Film size={20}/></span><div><h3>上傳歸屬</h3><p>確認作品所屬項目與集數</p></div></div><button className="cu-refresh" type="button" disabled={projectsLoading || phase !== "idle"} onClick={() => { setProjectsLoading(true); setProjectsReload(n => n+1); }}><RefreshCw size={14}/>{projectsLoading ? "讀取中…" : "刷新項目"}</button></header>
        <div className={`cu-context-fields ${projectId ? "" : "is-independent"}`}><label><span>所屬項目</span><select value={projectId} disabled={phase !== "idle"} onChange={e => { setProjectId(e.target.value);setEpisodeSubmissions([]); setEpisodeCount(0); setEpisodeNumber(1); history.replaceState(null, "", "#videos"); }}><option value="">請選擇當前身份的項目</option>{projects.map(item => <option key={item.id} value={item.id}>項目交付 · {item.title} · {{ PENDING_CONTRACT: "待簽約", SIGNED: "待安排製作", PRODUCING: "製作中", DELIVERED: "待驗收", COMPLETED: "已完成" }[item.stage] || item.stage}</option>)}{projectId && !projects.some(item => item.id === projectId) && <option value={projectId}>正在核對指定項目</option>}</select></label>
        {projectId && <label><span>上傳集數 <small>{episodeCount ? `共 ${episodeCount} 集` : "正在核對…"}</small></span><div className="cu-episode-input"><span>第</span><input aria-label="對應集數" type="number" min={1} max={episodeCount || 500} step={1} value={episodeNumber} disabled={phase !== "idle"} onChange={e => { setEpisodeNumber(Number(e.target.value)); history.replaceState(null, "", "#videos"); }}/><span>集</span></div></label>}</div>
        {projectId && <footer className="cu-context-footer"><span>本次視頻將提交至所選集數</span><div><a href={`#projects?project=${encodeURIComponent(projectId)}`}><Film size={14}/>查看項目與逐集進度</a>{!permissions.member&&<a href={`#contracts?project=${encodeURIComponent(projectId)}`}>查看 / 確認項目合作協議<ArrowLeft size={14} className="cu-link-arrow"/></a>}</div></footer>}
        {projectsError && <p className="cu-context-error" role="alert">項目列表：{projectsError}</p>}
        {!projectsLoading && !projectsError && !projects.length && <p className="cu-context-notice">目前沒有項目，請先在「我的項目」建立項目並確認承諾集數，再選擇對應集數上傳。</p>}
        {episodeEditingLocked&&<p className="cu-context-notice" role="status">第 {episodeNumber} 集{episodeLockReason}，不可重複上傳。你可以切換其他集數繼續創作。</p>}
        {projectError && <p className="cu-context-error" role="alert">項目資料：{projectError}</p>}
      </section>
      </div>
      <div className="cw-video-editor cw-video-editor--steps"><div className="cw-video-media" style={{display:step===2?undefined:"none"}}>
        <div className="cw-upload-media-title"><h3>正片視頻 <em className="cu-required">*</em> · {file ? 1 : 0} 個</h3><span>{projectId ? `第 ${episodeNumber} 集` : "單部作品"}</span></div><label className="cw-video-file"><Plus size={26} /><b>{file ? "重新選擇視頻" : "點擊上傳視頻"}</b><span>MP4 / MOV / WebM · 單個文件不超過 {MAX_VIDEO_BYTES / 1024 / 1024} MB</span><small>{file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : "選擇本集正片，確認資料後開始上傳"}</small><input ref={fileInput} type="file" accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm" aria-label="選擇視頻文件" disabled={phase !== "idle"||episodeEditingLocked|| (!!projectId&&!episodeCount)} onChange={e => chooseFile(e.target.files?.[0] ?? null)} /></label>
        {preview ? <video className="cw-video-preview" src={preview} controls preload="metadata" playsInline /> : null}
      </div><div className="cw-video-fields">
        <div className="cw-upload-basic" style={{display:step===1?undefined:"none"}}>
        <h3 className="cu-required-heading">本集上架資料 <small>標記 * 的項目為必填</small></h3><div className="cw-upload-details"><div className="cw-upload-copy"><label><span>{projectId ? "本集標題" : "視頻標題"} <em className="cu-required">*</em></span><input value={title} onChange={e => setTitle(e.target.value)} maxLength={128} required placeholder="為作品起一個名字" disabled={busy || (phase === "published" || phase === "saved") || episodeEditingLocked} /></label>
        <label><span>本集簡介（選填）</span><textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={2000} rows={3} placeholder="介紹故事、創意或製作過程" disabled={busy || (phase === "published" || phase === "saved") || episodeEditingLocked} /><small>{description.length} / 2000</small></label>
        </div><div className="cw-upload-cover-column"><span className="cw-cover-field-label">本集封面 <em className="cu-required">*</em></span><label className="cw-video-cover">{coverPreview ? <Image unoptimized fill sizes="120px" src={coverPreview} alt="已選擇的作品封面" /> : <><ImagePlus size={24} /><span>點擊上傳</span></>}<span className="cw-cover-replace">{coverPreview ? "更換封面" : "選擇封面"}</span><input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="選擇封面圖片" disabled={busy || (phase === "published" || phase === "saved")||episodeEditingLocked|| (!!projectId&&!episodeCount)} onChange={e => {
          const value = e.target.files?.[0];
          if (value && value.size > 0 && value.size <= MAX_COVER_BYTES && ["image/jpeg", "image/png", "image/webp"].includes(value.type)) { setCover(value); setError(""); }
          else { setError("請選擇 5 MB 以內的 JPG、PNG 或 WebP 圖片"); e.target.value = ""; }
        }} /></label>
        <div className="cw-cover-guidance"><p>封面要求：</p><p>JPG / PNG / WebP 格式</p><p>文件大小不超過 5 MB</p><p>{projectId ? "用於本集展示，首次建立劇目時也作為主封面。" : "用於 App 作品列表與播放頁展示。"}</p></div>
        </div></div>
        {projectId && <details className="pm-delivery-note"><summary>交付說明（選填）</summary><label>交付說明<textarea value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)} maxLength={1000} rows={3} disabled={busy || (phase === "published" || phase === "saved") || episodeEditingLocked} placeholder="如有需要，可說明本集完成內容及修改情況" /></label></details>}
        </div>
        <div style={{display:step===1?undefined:"none"}}>{projectId && <ProjectMaterials key={projectId} projectId={projectId} disabled={busy || phase !== "idle" || episodeEditingLocked} handle={materials}/>}</div>
        <div style={{display:step===3?undefined:"none"}}>
        <div className="cw-upload-summary"><strong>{title || "作品資料"}</strong><p>{projectId?`第 ${episodeNumber} 集 · 項目交付`:"獨立作品"}</p><p>{file?.name} {file?`· ${(file.size/1024/1024).toFixed(1)} MB`:""}</p>{coverPreview&&<Image unoptimized width={160} height={100} src={coverPreview} alt="待提交封面"/>}</div>
        <div className="cw-video-progress" role="status"><div><b>{projectId && phase === "published" ? "已提交項目驗收" : projectId && phase === "uploaded" ? "視頻已上傳，等待重試提交" : phaseLabels[phase]}</b><span>{progress}%</span></div><progress max={100} value={progress} aria-label="視頻上傳進度" /></div>
        <p className="cw-video-hint">{projectId && !permissions.canSubmit ? "上傳完成後將保存為待提交稿，請總管理員或有提交權限的成員在項目中提交驗收。" : projectId ? "點擊開始上傳後，視頻與封面上傳完成將自動提交審核。請等待顯示「已提交項目驗收」，期間勿關閉或刷新此頁。" : "上傳完成後，點擊「發佈到 App」提交作品。展示時間以平台處理結果為準。"}</p>
        <div className="cw-video-actions">
          {phase === "uploading" ? <button type="button" className="cw-outline" onClick={pause}><Pause size={16} />暫停上傳</button> : phase === "paused" ? <button type="button" className="cw-primary" disabled={episodeEditingLocked} onClick={resume}><Play size={16} />繼續上傳</button> : (phase === "published" || phase === "saved") ? <><span className="cw-video-success"><CheckCircle2 size={18} />{phase==="saved"?"已保存待提交":"提交成功"}</span>{projectId && <a href={`#projects?project=${encodeURIComponent(projectId)}`}>返回項目查看交付</a>}<button type="button" className="cw-outline" onClick={reset}>上傳下一個視頻</button></> : <button type="submit" className="cw-primary" disabled={busy || episodeEditingLocked || !file || !cover || (!!projectId && (!episodeCount || !!projectError))}><UploadCloud size={17} />{phase === "uploaded" ? projectId ? "重試提交審核" : "發佈到 App" : busy ? "處理中…" : "開始上傳"}</button>}
          {phase === "paused" && <button type="button" className="cw-text-button" onClick={() => { uploader.current?.cancelFile(0); reset(); }}>取消並重新選擇</button>}
        </div>
        </div>
        <div className="cw-upload-step-actions">{step>1&&phase==="idle"&&<button type="button" className="cw-outline" onClick={()=>setStep(step-1)}>上一步</button>}{step<3&&<button type="button" className="cw-primary" disabled={(!projectId) || savingMaterials || episodeEditingLocked || (!!projectId&&(!episodeCount||!!projectError)) || (step===1?(!cover||!title.trim()):(!file||!cover))} onClick={async()=>{if(step===1&&projectId){setSavingMaterials(true);try{if(!await materials.current?.save())return;}finally{setSavingMaterials(false);}}setStep(step+1);}}>{savingMaterials?"正在保存…":"下一步"}</button>}</div>
        {error ? <p className="cw-error" role="alert">{error}</p> : null}
      </div></div>
    </form>:<section className="cw-card"><h1 className="cw-page-title">視頻管理</h1><p>可查看企業視頻及交付進度；上傳與修改請聯絡有創作權限的成員。</p></section>}
    {(viewer || permissions.member) && <ProjectVideoList active={active} revision={projectRevision} />}
    {viewer ? <section className="cw-card"><div className="cw-card-title"><h2>App 賬號獨立視頻 <span>未按漫劇 / 短劇歸類</span></h2><button className="cw-text-button" disabled={loading} onClick={() => void refresh(page)}><RefreshCw size={15} />{loading ? "讀取中…" : "刷新作品"}</button></div>
      <p className="cw-video-hint">以下為綁定 App 賬號的共用歷史記錄，不計入當前身份的項目統計。新作品請在對應身份下建立項目並上傳劇集。</p>
      {listError ? <p className="cw-error" role="alert">{listError}</p> : !items.length ? <p className="cw-video-empty">{loading ? "正在讀取作品…" : "當前頁暫無 App 獨立視頻。"}</p> : <div className="cw-video-grid">{items.map(item => <article className="cw-video-item" key={item.id}>
        {item.coverUrl ? <Image unoptimized width={640} height={360} src={item.coverUrl} alt={item.title} loading="lazy" /> : <div className="cw-video-placeholder"><Film size={28} /></div>}
        <div><span className="cw-pill">{item.status === "normal" ? "正常" : ["hidden", "pending", "review"].includes(item.status) ? "待展示" : "處理中"}</span><h3>{item.title}</h3><p>{item.description}</p><small>{item.views.toLocaleString()} 次播放 · <VideoDuration seconds={item.durationSeconds} src={item.videoUrl} /></small><button className="cw-text-button cw-video-delete" type="button" disabled={deleting} onClick={() => { setDeleteError(""); setDeleteTarget(item); }}><Trash2 size={14} />刪除</button></div>
      </article>)}</div>}
      <div className="cw-video-pagination"><button className="cw-outline" type="button" disabled={loading || page <= 1} onClick={() => void refresh(page - 1)}>上一頁</button><span>第 {page} 頁</span><button className="cw-outline" type="button" disabled={loading || !hasMore} onClick={() => void refresh(page + 1)}>下一頁</button></div>
    </section> : null}
    {deleteTarget ? <dialog ref={deleteDialog} className="cw-modal" aria-labelledby="cw-delete-video-title" onCancel={event => { event.preventDefault(); if (!deleting) setDeleteTarget(null); }}>
      <div className="cw-modal-head"><h2 id="cw-delete-video-title">刪除視頻</h2></div>
      <div className="cw-video-delete-confirm"><p>確定刪除《{deleteTarget.title}》嗎？刪除後 App 和官網將不再展示這條作品，無法在此恢復。</p>
        {deleteError ? <p className="cw-error" role="alert">{deleteError}</p> : null}
        <div className="cw-video-actions"><button type="button" className="cw-outline" disabled={deleting} onClick={() => setDeleteTarget(null)}>取消</button><button type="button" className="cw-primary" disabled={deleting} onClick={() => void deleteVideo()}>{deleting ? "正在刪除…" : "確認刪除"}</button></div>
      </div>
    </dialog> : null}
  </div>;
}






