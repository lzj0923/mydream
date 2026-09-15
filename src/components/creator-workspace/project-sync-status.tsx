"use client";
import {useCompanyPermissions} from "./company-team";
import {useEffect,useState} from "react";
import {RefreshCw,CheckCircle2,Clock3,AlertCircle} from "lucide-react";
type Status={state:string;revision:number;message?:string};
export function ProjectSyncStatus({projectId,admin,revision}:{projectId:string;admin:boolean;revision:string}){
 const permissions=useCompanyPermissions();
 const [status,setStatus]=useState<Status|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[reload,setReload]=useState(0);
 const path=`/api/creator/${admin?"project-reviews":"projects"}/${projectId}/sync`;
 useEffect(()=>{const controller=new AbortController();async function load(){try{const r=await fetch(path,{cache:"no-store",signal:controller.signal});const d=await r.json();if(!r.ok)throw Error(d.detail||"無法讀取同步狀態");setStatus(d);setError("");}catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:"讀取失敗");}}void load();const timer=setInterval(()=>{if(document.visibilityState==="visible")void load();},15000);return()=>{controller.abort();clearInterval(timer);};},[path,revision,reload]);
 async function sync(){setBusy(true);setError("");try{const r=await fetch(admin?"/api/app-admin/project-sync":path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(admin?{projectId}:{})});const d=await r.json();if(!r.ok)throw Error(d.message||d.detail||"同步未完成");setStatus(d);}catch(e){setError(e instanceof Error?e.message:"同步失敗");}finally{setBusy(false);setReload(n=>n+1);}}
 if(status?.state==="NOT_REQUIRED"&&!error)return null;
 const state=status?.state,Icon=state==="SYNCED"?CheckCircle2:state==="FAILED"?AlertCircle:Clock3;
 return <div className={`cp-sync-strip ${state==="SYNCED"?"is-success":""}`}><Icon size={18}/><div><strong>{busy?"正在同步 App…":({PENDING:"待同步至 App",SYNCING:"App 同步執行中",SYNCED:"已同步至 App",FAILED:"App 同步未完成"}[state||""]||"正在讀取同步狀態…")}</strong><p>{error||status?.message||(state==="SYNCED"?"地區、分類、畫面方向與已關聯劇集價格已回讀核對。":admin?"使用當前 App 管理員權限同步，失敗可重試。":"本站資料已保存，等待平台同步至 App；同步成功後這裡會更新。")}</p></div>{admin&&["PENDING","FAILED"].includes(state||"")?<button type="button" className="cp-settings-save" disabled={busy} onClick={()=>void sync()}><RefreshCw size={14}/>{state==="FAILED"?"重試同步":"同步至 App"}</button>:!admin&&!permissions.member&&state==="FAILED"?<button type="button" disabled={busy} onClick={()=>void sync()}>重新申請同步</button>:<button type="button" aria-label="刷新同步狀態" disabled={busy} onClick={()=>setReload(n=>n+1)}><RefreshCw size={14}/></button>}</div>;
}

