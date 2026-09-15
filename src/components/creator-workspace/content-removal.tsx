"use client";
import {useEffect,useState} from "react";
import {useCompanyPermissions} from "./company-team";

type Action="DELETE"|"WITHDRAW"|"REQUEST"|"NONE";
type Removal={id:string;submissionId:string;episodeNumber?:number;state:string;reason:string;reviewNote:string;version:number};
type Detail={action:Action;version:number;requests:Removal[]};
const labels:Record<string,string>={PENDING:"待審核",ACCEPTED:"已受理 · 等待 App 下架",REJECTED:"已駁回",COMPLETED:"已核對下架"};
async function api<T>(path:string,body?:unknown):Promise<T>{
 const r=await fetch(`/api/creator/${path}`,{method:body===undefined?"GET":"POST",cache:"no-store",headers:{"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
 const d=await r.json();if(!r.ok)throw new Error(d.detail||"操作失敗，請重試");return d;
}
export function ContentRemoval({projectId,submissionId,admin=false,revision=0,onChanged,onRemoved}:{projectId:string;submissionId?:string;admin?:boolean;revision?:number;onChanged:()=>void;onRemoved?:()=>void}){
 const permissions=useCompanyPermissions();
 if(!admin&&permissions.member)return null;
 return <RemovalPanel projectId={projectId} submissionId={submissionId} admin={admin} revision={revision} onChanged={onChanged} onRemoved={onRemoved}/>;
}
export function RemovalQueue({revision,onOpen}:{revision:string;onOpen:(id:string)=>void}){
 const [rows,setRows]=useState<{projectId:string;title:string;state:string;requestCount:number}[]>([]),[error,setError]=useState("");
 useEffect(()=>{let alive=true;api<typeof rows>("project-reviews/removals").then(d=>{if(alive){setRows(d);setError("");}}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[revision]);
 return <section className="cp-action"><h3>待處理下架申請</h3>{error?<p role="alert" className="cp-error">{error}</p>:rows.length?rows.map(r=><button key={`${r.projectId}-${r.state}`} onClick={()=>onOpen(r.projectId)}>{r.title} · {labels[r.state]} · {r.requestCount} 項</button>):<p>暫無待處理申請。</p>}</section>;
}
function RemovalPanel({projectId,submissionId,admin,revision,onChanged,onRemoved}:{projectId:string;submissionId?:string;admin:boolean;revision:number;onChanged:()=>void;onRemoved?:()=>void}){
 const [data,setData]=useState<Detail|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0),[note,setNote]=useState(""),[confirm,setConfirm]=useState(false);
 const base=`${admin?"project-reviews":"projects"}/${projectId}/${submissionId?`episodes/${submissionId}/`:""}removal`;
 useEffect(()=>{let alive=true;api<Detail>(base).then(d=>{if(alive){setData(d);setError("");}}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[base,revision,refresh]);
 async function act(action:string,version:number,id?:string){
  setBusy(true);setError("");try{const result=await api<{removed?:boolean}>(id?`${base}/${id}`:base,{action,version,note});setConfirm(false);setNote("");if(result.removed){onRemoved?.();return;}setRefresh(n=>n+1);onChanged();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 const text=data?.action==="DELETE"?`刪除${submissionId?"視頻草稿":"草稿項目"}`:data?.action==="WITHDRAW"?"撤回驗收":"申請下架";
 return <section className="cp-action" aria-label={submissionId?"視頻刪除與下架":"項目刪除與下架"}>
  <h4>{admin?"下架申請審核":submissionId?"視頻管理":"項目管理"}</h4>
  {!admin&&data&&data.action!=="NONE"&&<><p>{data.action==="DELETE"?"刪除後將退出使用中的內容列表，歷史操作記錄保留。":data.action==="WITHDRAW"?"撤回後返回草稿，可繼續編輯或刪除。撤回項目會同時撤回尚未驗收的分集。":"已驗收、已上架或有合作記錄的內容須由平台處理下架，合同及分成記錄保留。"}</p>
  {!confirm?<button disabled={busy} onClick={()=>setConfirm(true)}>{text}</button>:<div><p>確認{text}？{data.action==="DELETE"&&!submissionId&&"項目內的視頻草稿也會一併刪除。"}</p>{data.action==="REQUEST"&&<label>下架原因<textarea maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} disabled={busy}/></label>}<div className="cp-buttons"><button disabled={busy||(data.action==="REQUEST"&&!note.trim())} onClick={()=>void act(data.action,data.version)}>確認{text}</button><button disabled={busy} onClick={()=>setConfirm(false)}>取消</button></div></div>}</>}
  {admin&&<p>受理後請在 App 管理後台完成下架，再點擊核對。系統確認 App 已下架後才會完成申請，原始資料與分成記錄保留。</p>}
  {admin&&data?.requests.some(r=>["PENDING","ACCEPTED"].includes(r.state))&&<label>本次處理說明<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={1000} disabled={busy}/></label>}
  {data?.requests.map(r=><article key={r.id}><p><strong>{r.submissionId?`第 ${r.episodeNumber} 集`:"整個項目"} · {labels[r.state]||r.state}</strong></p><p>申請原因：{r.reason}</p>{r.reviewNote&&<p>平台回覆：{r.reviewNote}</p>}{admin&&["PENDING","ACCEPTED"].includes(r.state)&&<div className="cp-buttons"><button disabled={busy||!note.trim()} onClick={()=>void act(r.state==="PENDING"?"ACCEPTED":"COMPLETED",r.version,r.id)}>{r.state==="PENDING"?"受理下架申請":"核對 App 下架並完成"}</button><button disabled={busy||!note.trim()} onClick={()=>void act("REJECTED",r.version,r.id)}>駁回並說明原因</button></div>}</article>)}
  {admin&&data&&!data.requests.length&&<p>暫無下架申請。</p>}{busy&&<p role="status">正在處理…</p>}{error&&<p className="cp-error" role="alert">{error}<button disabled={busy} onClick={()=>setRefresh(n=>n+1)}>重新讀取</button></p>}
 </section>;
}
