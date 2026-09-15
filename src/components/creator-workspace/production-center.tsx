"use client";
import {projectEventMessage} from "@/lib/creator-video/project-event-message";
import Link from "next/link";
import {ContentRemoval,RemovalQueue} from "./content-removal";
import {useCompanyPermissions} from "./company-team";
import { useEffect,useState,type FormEvent } from "react";
import { FileCheck2,RefreshCw,ChevronRight,ArrowLeft,Film,Check,Clock3,Activity } from "lucide-react";
import "./production-center.css";
import {useWorkType,workTypeLabels} from "./work-type";
import {creatorOptionLabel,genres} from "./types";
import {ProjectContentEditor} from "./project-content-editor";
import {ProjectSettingsFields,ProjectSettingsPanel} from "./project-settings";
import {settingsFromForm,type ProjectSettings} from "@/lib/creator-video/project-settings";
import { ProjectMaterials } from "./project-materials";
import { ProjectEpisodes } from "./project-episodes";
type Stage="PENDING_CONTRACT"|"SIGNED"|"PRODUCING"|"DELIVERED"|"COMPLETED";
export type Project={genre?:string;synopsis?:string;settings?:ProjectSettings|null;status:string;episodeCount:number;createdAt:string;id:string;title:string;ownerKey:string;stage:Stage;contractReference:string;note:string;version:number;approvedAt:string;videos?:{id:number;title:string}[];events?:{actor?:string;stage:Stage;note:string;createdAt:string}[]};
const labels:Record<Stage,string>={PENDING_CONTRACT:"待簽約",SIGNED:"已記錄線下籤約",PRODUCING:"製作中",DELIVERED:"待驗收",COMPLETED:"已完成"};
const guidance:Record<Stage,string>={PENDING_CONTRACT:"請在合同管理閱讀並提交本項目的合作確認書，平台確認後即可上傳。",SIGNED:"已有歷史線下記錄；請在合同管理補充本項目的合作確認，平台確認後即可上傳。",PRODUCING:"按承諾集數上傳項目視頻，逐集提交交付、驗收並核對 App 上架關聯。",DELIVERED:"交付已提交，等待平台驗收。退回後可以重新選擇視頻並提交。",COMPLETED:"平台已驗收交付。關聯記錄用於項目跟進，收益以 App 實際入賬為準。"};
async function request<T>(path:string,method="GET",body?:unknown):Promise<T>{const r=await fetch(`/api/creator/${path}`,{method,cache:"no-store",headers:{"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Object.assign(new Error(d.detail||"操作失敗，請重試"),{status:r.status});return d;}
export function ProductionCenter({admin=false,contracts=false,revision="",createRequested=false,onCreated=()=>{}}:{admin?:boolean;contracts?:boolean;revision?:string;createRequested?:boolean;onCreated?:()=>void}){
 const [rows,setRows]=useState<Project[]>([]);const [selected,setSelected]=useState<Project|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [auth,setAuth]=useState(false);const [refresh,setRefresh]=useState(0);
 const [creating,setCreating]=useState(false);const permissions=useCompanyPermissions();
 const base=admin?"project-reviews":"projects";
 const sectionName=admin?"deliveries":contracts?"contracts":"projects";
 useEffect(()=>{let alive=true;request<Project[]>(base).then(d=>{if(alive){setRows(d);setError("");setAuth(false);setLoading(false);}}).catch(e=>{if(alive){setError(e.message);setAuth(e.status===401||e.status===403);setLoading(false);}});return()=>{alive=false;};},[base,refresh,revision]);
 useEffect(()=>{let alive=true; const apply=()=>{const [section,query]=location.hash.slice(1).split("?");const id=new URLSearchParams(query).get("project");if(id&&section===sectionName){request<Project>(`${base}/${encodeURIComponent(id)}`).then(value=>{if(alive){setSelected(value);setError("");}}).catch(e=>{if(alive)setError(e.message);});}};apply();window.addEventListener("hashchange",apply);return()=>{alive=false;window.removeEventListener("hashchange",apply);};},[base,sectionName]);
 const reload=()=>{history.replaceState(null,"",`#${sectionName}`);setError("");setLoading(true);setSelected(null);setRefresh(n=>n+1);};
 const open=async(id:string)=>{history.replaceState(null,"",`#${sectionName}?project=${encodeURIComponent(id)}`);setLoading(true);setError("");try{setSelected(await request<Project>(`${base}/${id}`));}catch(e){setError(e instanceof Error?e.message:"讀取失敗");}finally{setLoading(false);}};
 if(!admin&&permissions.canEdit&&(creating||createRequested))return <ProjectCreate cancel={()=>{setCreating(false);onCreated();}} done={p=>{setCreating(false);onCreated();setSelected(p);setRows(current=>[p,...current]);setLoading(false);history.replaceState(null,"",`#projects?project=${encodeURIComponent(p.id)}`);}}/>;
 return <section className="cw-card cp-center"><div className="cp-head"><div><h1 className="cw-page-title">{admin?"簽約與製作跟進":contracts?"我的合同進度":"我的項目"}</h1><p>{admin?"管理項目製作進度與逐集交付驗收。":"建立項目並確認承諾集數，按集創作、上傳及提交。"}</p></div>{!admin&&!contracts&&permissions.canEdit&&(rows.length>0||selected)&&<button className="cw-primary" onClick={()=>setCreating(true)}>創建項目</button>}<button onClick={reload} disabled={loading}><RefreshCw size={14}/>刷新</button></div>
 {admin&&!selected&&<RemovalQueue revision={`${refresh}-${revision}`} onOpen={id=>void open(id)}/>}
 {contracts&&<div className="cp-notice"><FileCheck2 size={18}/><span>合同文件待提供。此處僅展示進度及平台記錄的線下合同編號，不提供電子簽署，也不生成已簽署合同文件。</span></div>}
 {error&&<div className="cp-error" role="alert">{error}{auth&&<Link href={admin?"/admin/app#deliveries":"/creator/login?next=%2Fcreator%2Fworkspace%23projects"}>{admin?"登錄App 管理員":"登錄創作者賬號"}</Link>}<button onClick={reload}>重試</button></div>}
 {loading?<p role="status">正在讀取項目…</p>:selected?<><button className="cp-back" onClick={()=>{setSelected(null);history.replaceState(null,"",`#${sectionName}`);}}><ArrowLeft size={14}/>返回項目列表</button><ProjectDetail onRemoved={reload} key={`${selected.id}-${selected.version}`} project={selected} admin={admin} onSaved={p=>{setSelected(p);setRows(rows.map(r=>r.id===p.id?p:r));}} onRefresh={()=>{request<Project>(`${base}/${selected.id}`).then(setSelected).catch(e=>setError(e.message));}}/></>:!error&&<div className="cp-list">{rows.length?rows.map(p=><button className="cp-project" key={p.id} onClick={()=>void open(p.id)}><span><strong>{p.title}</strong><small>{contracts?(p.contractReference?`線下合同：${p.contractReference}`:"合同文件待補充"):guidance[p.stage]}</small></span><span className="cp-stage">{labels[p.stage]}</span><ChevronRight size={16}/></button>):<div className="cp-empty"><FileCheck2 size={28}/><h3>暫無項目</h3><p>填寫承諾集數，開始你的第一個項目。</p>{!admin&&!contracts&&permissions.canEdit&&<button className="cw-primary" onClick={()=>setCreating(true)}>創建項目</button>}</div>}</div>}
 </section>;
}
function ProjectDetail({project:p,admin,onSaved,onRefresh,onRemoved}:{project:Project;admin:boolean;onSaved:(p:Project)=>void;onRefresh:()=>void;onRemoved:()=>void}){
 const permissions=useCompanyPermissions();
 const [note,setNote]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 const save=async(stage?:Stage)=>{setError("");if(!note.trim()){setError("請填寫本次操作說明。");return;}setBusy(true);try{onSaved(await request<Project>(`project-reviews/${p.id}`,"PUT",{stage,note,contractReference:p.contractReference,version:p.version}));}catch(e){setError(e instanceof Error?e.message:"保存失敗");}finally{setBusy(false);}};
 const stages:Stage[]=p.status==="ACTIVE"?["PRODUCING","DELIVERED","COMPLETED"]:["PENDING_CONTRACT","PRODUCING","DELIVERED","COMPLETED"];
 const canAdmin=admin&&p.stage==="DELIVERED";
 const current=stages.indexOf(p.stage==="SIGNED"?"PENDING_CONTRACT":p.stage);
 return <div className="cp-detail"><section className="pd-overview" aria-label="項目概覽"><header className="pd-heading"><span className="pd-icon"><Film size={22}/></span><div><span className="pd-eyebrow">項目概覽</span><h3>{p.title}</h3></div><span className="pd-status">{labels[p.stage]}</span></header>
 <ol className="pd-progress" aria-label="製作流程">{stages.map((s,i)=><li key={s} className={i===current?"is-current":i<current?"is-complete":""} aria-current={i===current?"step":undefined}><span className="pd-step-number">{i<current?<Check size={16}/>:i+1}</span><div><strong>{labels[s]}</strong><small>{i===current?"當前階段":i<current?"已完成":"待進行"}</small></div></li>)}</ol>
 <div className="pd-summary"><div className="pd-count"><span>承諾集數</span><strong>{p.episodeCount}<small>集</small></strong></div><div className="pd-latest"><span><Activity size={14}/>最近進度</span><p>{p.note||"暫無進度說明"}</p></div></div>
 <div className="pd-guidance"><Clock3 size={16}/><p>{guidance[p.stage]}</p></div>
 {!permissions.member&&p.status!=="ACTIVE"&&<a className="pd-contract" href={admin?"#agreements":`#contracts?project=${encodeURIComponent(p.id)}`}>{admin?"前往合作協議審核":"查看並確認項目合作協議"}<ChevronRight size={14}/></a>}</section>
 {!!p.videos?.length&&<div className="cp-linked"><h4>歷史交付 · 已關聯 App 獨立視頻</h4>{p.videos.map(v=><p key={v.id}><Link href={`/universe/videos/app-video-${v.id}`} target="_blank" rel="noreferrer">{v.title} · 查看視頻</Link> <small>App 視頻 ID：{v.id}</small></p>)}<small>以上為交付時的關聯記錄；App 視頻後續刪除或隱藏不會自動修改項目狀態。</small></div>}
 {canAdmin&&<div className="cp-action"><label>本次操作說明<textarea maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} disabled={busy} placeholder={admin?"填寫製作安排、驗收結果或需要修改的內容":"說明交付內容、集數及對應視頻"}/></label>{error&&<p role="alert" className="cp-error">{error}<button disabled={busy} onClick={onRefresh}>重新讀取最新狀態</button></p>}<div className="cp-buttons"><button disabled={busy} onClick={()=>void save("COMPLETED")}>驗收通過，完成項目</button><button disabled={busy} onClick={()=>void save("PRODUCING")}>退回修改</button>{busy&&<span role="status">正在保存，請勿重複操作…</span>}</div></div>}
 {!admin&&<ProjectContentEditor key={`${p.id}:${p.version}`} project={p} onSaved={onRefresh}/>}
 <ProjectSettingsPanel projectId={p.id} settings={p.settings} admin={admin} onChanged={onRefresh}/>
 <details className="pd-materials-entry"><summary>查看補充審核資料與修改意見</summary><ProjectMaterials key={p.id} projectId={p.id} admin={admin}/></details>
 <ProjectEpisodes projectId={p.id} admin={admin} onProjectChanged={onRefresh}/>
 <ContentRemoval projectId={p.id} admin={admin} revision={p.version} onChanged={onRefresh} onRemoved={onRemoved}/>
 <ProjectHistory project={p} admin={admin}/></div>;

}

function ProjectHistory({project:p,admin}:{project:Project;admin:boolean}){
 const [expanded,setExpanded]=useState(false);
 const events=[...(p.events||[]),...(p.status!=="ACTIVE"?[{stage:"PENDING_CONTRACT" as Stage,note:"已進入項目跟進流程。",createdAt:p.approvedAt}]:[])];
 const visible=expanded?events:events.slice(0,6);
 return <section className="pd-history" aria-label="項目進度記錄"><header className="pd-heading"><span className="pd-icon"><Clock3 size={20}/></span><div><h4>項目進度記錄</h4><p>查看製作、驗收與上架的每次更新</p></div><span className="pd-total">{events.length} 條記錄</span></header>
 {events.length?<ol className="pd-timeline">{visible.map((e,i)=><li key={`${e.createdAt}-${i}`}><span className="pd-timeline-dot"/><div className="pd-event"><div className="pd-event-meta"><strong>{labels[e.stage]}</strong>{i===0&&<span>最新</span>}<time dateTime={e.createdAt||undefined}>{e.createdAt?new Date(e.createdAt).toLocaleString("zh-TW",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}):"時間未記錄"}</time></div><p>{admin?e.note:projectEventMessage(e.note)}</p>{admin&&"actor" in e&&e.actor&&<small>操作人：{e.actor}</small>}</div></li>)}</ol>:<p className="pd-no-events">暫無進度記錄，項目更新後會顯示在這裡。</p>}
 {events.length>6&&<footer><button type="button" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded?"收起記錄":`查看全部 ${events.length} 條記錄`}</button></footer>}</section>;
}

function ProjectCreate({cancel,done}:{cancel:()=>void;done:(p:Project)=>void}){
 const {workType}=useWorkType();
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(busy)return;const f=new FormData(e.currentTarget);setBusy(true);setError("");try{done(await request<Project>("projects","POST",{title:f.get("title"),genre:f.get("genre"),format:f.get("format"),episodeCount:Number(f.get("episodeCount")),synopsis:f.get("synopsis"),committed:f.get("committed")==="on",settings:settingsFromForm(f)}));}catch(e){setError((e as Error).message);setBusy(false);}}
 return <section className="cw-card cp-center"><div className="cp-head"><div><h1 className="cw-page-title">創建項目</h1><p>確認項目資料與承諾集數，建立後直接開始逐集創作。</p></div><button onClick={cancel} disabled={busy}>返回項目</button></div><form className="cw-editor cp-create-form" onSubmit={submit}><fieldset disabled={busy}><label><span>項目名稱 <em className="cu-required">*</em></span><input name="title" required maxLength={120} placeholder="為你的作品命名"/></label><div className="cw-form-grid"><label><span>題材 <em className="cu-required">*</em></span><select name="genre">{genres.map(g=><option key={g} value={g}>{creatorOptionLabel(g)}</option>)}</select></label><label><span>內容形式 <em className="cu-required">*</em></span><input name="format" value={workTypeLabels[workType]} readOnly aria-label="當前創作類型"/></label><label><span>承諾集數 <em className="cu-required">*</em></span><input type="number" name="episodeCount" min={1} max={500} step={1} required defaultValue={12}/></label></div><label><span>項目簡介 <em className="cu-required">*</em></span><textarea name="synopsis" rows={5} maxLength={5000} required placeholder="介紹故事背景、主要人物與創作方向"/></label><h3>上架資料</h3><ProjectSettingsFields/><div className="cp-create-footer"><label className="cp-create-consent"><input name="committed" type="checkbox" required/><span>我承諾按以上集數完成創作，並確認作品為原創或已取得合法授權。</span></label><p className="cp-create-note">建立後按第 1 集至承諾集數管理作品，逐集提交驗收。正式發佈仍需完成身份認證。</p>{error&&<p role="alert" className="cp-error">{error}</p>}<div className="cp-create-actions"><button type="button" onClick={cancel} disabled={busy}>取消</button><button type="submit" className="cw-primary" disabled={busy}>{busy?"正在建立…":"確認並創建項目"}</button></div></div></fieldset></form></section>;
}


