"use client";
import {useCompanyPermissions} from "./company-team";
import {useState,type FormEvent} from "react";
import { SlidersHorizontal, Pencil, Check, ArrowRight } from "lucide-react";
import "./project-settings.css";
import { ProjectSyncStatus } from "./project-sync-status";
import {projectAreas,projectCategories,settingsFromForm,type ProjectSettings} from "@/lib/creator-video/project-settings";
export function ProjectSettingsFields({initial}:{initial?:ProjectSettings|null}){
 const permissions=useCompanyPermissions();
 const [area,setArea]=useState(initial?.area||"zhf");
 return <div className="cw-form-grid cp-project-settings"><label><span>發佈地區 <em className="cu-required">*</em></span>{permissions.member&&<input type="hidden" name="area" value={area}/>}<select name="area" disabled={permissions.member} value={area} required onChange={e=>setArea(e.target.value)}>{projectAreas.map(a=><option key={a.value} value={a.value}>{a.label}</option>)}</select></label><label><span>App 分類 <em className="cu-required">*</em></span><select name="category" key={area} defaultValue={initial?.area===area?initial.category:""} required><option value="" disabled>請選擇分類</option>{projectCategories[area]?.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></label><label><span>畫面方向 <em className="cu-required">*</em></span><select name="landscape" defaultValue={initial?.landscape?"1":"0"}><option value="0">直屏</option><option value="1">橫屏</option></select></label><label><span>單集解鎖價格 <em className="cu-required">*</em></span><input name="price" readOnly={permissions.member} type="number" min="0" max="999999.99" step="0.01" required defaultValue={initial?.price??"0.00"}/><small>{permissions.member?"價格與發佈地區由總管理員設定":"0 表示免費，套用於此項目各集。"}</small></label></div>;
}
export function ProjectSettingsPanel({projectId,settings,admin,onChanged}:{projectId:string;settings?:ProjectSettings|null;admin:boolean;onChanged:()=>void}){
 const permissions=useCompanyPermissions();
 const [editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");try{const r=await fetch(`/api/creator/projects/${projectId}/settings`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(settingsFromForm(new FormData(e.currentTarget)))});const data=await r.json();if(!r.ok)throw Error(data.detail||"保存失敗");setEditing(false);onChanged();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const areaLabel=projectAreas.find(a=>a.value===settings?.area)?.label||settings?.area;
 const categoryLabel=projectCategories[settings?.area||""]?.find(c=>c.value===settings?.category)?.label||settings?.category;
 return <section className="cp-settings-card" aria-label="項目上架資料">
   <header className="cp-settings-header"><div className="cp-settings-heading"><span className="cp-settings-icon"><SlidersHorizontal size={21}/></span><div><h4>項目上架資料 <span className={`cp-settings-status ${settings?"is-ready":""}`}>{settings?"已完善":"待補充"}</span></h4><p>可隨時修改上架設定；已有 App 作品會提交平台同步。</p></div></div>{!admin&&permissions.canEdit&&!editing&&<button className={settings?"cp-settings-edit":"cp-settings-save"} onClick={()=>setEditing(true)}>{settings?<Pencil size={14}/>:<PlusIcon/>}{settings?"修改資料":"完善上架資料"}</button>}</header>
   {editing&&permissions.canEdit?<form className="cp-settings-form" onSubmit={save}><fieldset disabled={busy}><ProjectSettingsFields initial={settings}/>{error&&<p className="cp-settings-error" role="alert">{error}</p>}<footer className="cp-settings-footer"><span>保存後提交同步，App 生效進度見下方狀態</span><div><button className="cp-settings-cancel" type="button" onClick={()=>{setEditing(false);setError("");}}>取消</button><button className="cp-settings-save" type="submit"><Check size={15}/>{busy?"保存中…":"保存上架資料"}</button></div></footer></fieldset></form>:settings?<div className="cp-settings-values">{[["發佈地區",areaLabel],["App 分類",categoryLabel],["畫面方向",settings.landscape?"橫屏":"直屏"],["單集解鎖價格",Number(settings.price)===0?"免費":Number(settings.price).toFixed(2)]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>:<div className="cp-settings-empty"><span className="cp-settings-dot"/>請先完善上架資料，平台驗收後即可安排發佈。</div>}
 <ProjectSyncStatus projectId={projectId} admin={admin} revision={JSON.stringify(settings)}/>
 </section>;
}
function PlusIcon(){return <ArrowRight size={15}/>;}



