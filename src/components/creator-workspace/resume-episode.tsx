"use client";
import {useEffect,useRef,useState} from "react";
import {useCompanyPermissions} from "./company-team";
import {submitWhenProcessed} from "@/lib/creator-video/processing";
import type {EpisodeSubmission} from "./project-episodes";

async function api<T>(url:string,body?:unknown):Promise<T>{
 const form=body instanceof FormData;const r=await fetch(url,{method:body===undefined?"GET":"POST",cache:"no-store",headers:form?undefined:{"Content-Type":"application/json"},body:body===undefined?undefined:form?body:JSON.stringify(body)});
 const d=await r.json();if(!r.ok)throw Object.assign(new Error(d.detail||d.message||"操作失敗，請重試"),{code:d.code});return d;
}
export function ResumeEpisode({item,onChanged}:{item:EpisodeSubmission;onChanged:()=>void}){
 const permissions=useCompanyPermissions();
 const [cover,setCover]=useState(item.coverUrl||""),[note,setNote]=useState(item.note||"提交本集視頻與封面"),[version,setVersion]=useState(item.version);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(!item.coverUrl),[message,setMessage]=useState(""),[error,setError]=useState("");
 const [recoveryRevision,setRecoveryRevision]=useState(0);
 const controller=useRef<AbortController|null>(null);const mounted=useRef(true);const guard=useRef(false);
 const base=`/api/creator/projects/${item.projectId}/episodes/${item.id}`;
 const recovery=`/api/creator-videos/recovery?projectId=${encodeURIComponent(item.projectId)}&submissionId=${encodeURIComponent(item.id)}&purpose=${permissions.canUpload?"UPLOAD":"SUBMIT"}`;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;controller.current?.abort();};},[]);
 useEffect(()=>{if(item.coverUrl)return;let alive=true;api<{coverUrl:string}>(recovery).then(d=>{if(alive){setCover(d.coverUrl);setMessage(d.coverUrl?"已找回原封面，將繼續提交同一份視頻。":"未找到已保存的封面，請補充封面後繼續；視頻無需重新上傳。");}}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[item.coverUrl,recovery,recoveryRevision]);
 async function upload(file:File|undefined){
  if(!file||guard.current)return;guard.current=true;setBusy(true);setError("");
  try{const form=new FormData();form.set("file",file);const saved=await api<{coverUrl:string;version:number}>(recovery,form);if(mounted.current){setCover(saved.coverUrl);setVersion(saved.version);setMessage("封面已保存到本稿，可以繼續提交。");}}
  catch(e){if(mounted.current)setError((e as Error).message);}finally{guard.current=false;if(mounted.current)setBusy(false);}
 }
 async function submit(saveOnly=false){
  if(guard.current||!cover||!note.trim())return;guard.current=true;setBusy(true);setError("");setMessage("");
  const abort=new AbortController();controller.current=abort;
  try{
   const body={title:item.title,description:item.description,coverUrl:cover,note,version};
   // Persist metadata before cloud readiness checks so leaving this page never strands the draft again.
   const saved=permissions.canUpload?await api<EpisodeSubmission>(`${base}/metadata`,body):{version};
   if(mounted.current)setVersion(saved.version);
   if(saveOnly){if(mounted.current){setMessage("資料已保存，等待提交驗收。");onChanged();}return;}
   await submitWhenProcessed(()=>api(`${base}/submit`,{...body,version:saved.version}),{signal:abort.signal,onWaiting:()=>{if(mounted.current)setMessage("雲端處理中，完成後自動提交；無需重新上傳。");}});
   if(mounted.current){setMessage("已提交項目驗收。");onChanged();}
  }catch(e){if(mounted.current)setError((e as Error).message);}finally{guard.current=false;controller.current=null;if(mounted.current)setBusy(false);}
 }
 return <div className="cp-action cp-resume"><h4>{item.state==="CHANGES_REQUESTED"?"重新提交本稿":"繼續完成並提交"}</h4><p>保留第 {item.episodeNumber} 集 V{item.revision} 的原視頻，補齊資料後即可提交。</p>
  {loading&&<p role="status">正在找回已上傳的封面…</p>}{cover&&<img src={cover} alt="本集封面" width={120} height={120} style={{objectFit:"cover",borderRadius:6}}/>}
  {permissions.canUpload&&<label>{cover?"更換封面（選填）":"補充封面"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||loading} onChange={e=>void upload(e.target.files?.[0])}/></label>}
  {!cover&&!permissions.canUpload&&!loading&&<p>請有上傳權限的成員補充封面後，再由你提交驗收。</p>}
  <label>交付說明<textarea value={note} maxLength={1000} disabled={busy} onChange={e=>setNote(e.target.value)}/></label>
  <div className="cp-buttons">{permissions.canSubmit&&<button type="button" disabled={busy||loading||!cover||!note.trim()} onClick={()=>void submit()}>{busy?"正在處理…":item.state==="CHANGES_REQUESTED"?"重新提交驗收":"提交驗收"}</button>}{permissions.canUpload&&<button type="button" disabled={busy||loading||!cover||!note.trim()} onClick={()=>void submit(true)}>保存待提交</button>}</div>
  {message&&<p role="status">{message}</p>}{error&&<p role="alert" className="cp-error">{error}<button type="button" disabled={busy} onClick={()=>{setError("");setRecoveryRevision(n=>n+1);onChanged();}}>重新讀取本稿</button></p>}
 </div>;
}
