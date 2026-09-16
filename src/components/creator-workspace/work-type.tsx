"use client";
import {createContext,useContext,useEffect,useState,type ReactNode} from "react";
export type WorkType="COMIC"|"SHORT_DRAMA";
export const workTypeLabels:Record<WorkType,string>={COMIC:"漫劇",SHORT_DRAMA:"短劇"};
const Context=createContext<{workType:WorkType;unclassifiedCount:number}>({workType:"COMIC",unclassifiedCount:0});
export const useWorkType=()=>useContext(Context);
export function WorkTypeProvider({children}:{children:ReactNode}){
 const [data,setData]=useState<{workType:WorkType;unclassifiedCount:number}|null>(null),[error,setError]=useState("");
 useEffect(()=>{const c=new AbortController();fetch('/api/creator/team/work-type',{cache:'no-store',signal:c.signal}).then(async r=>{if(r.status===401)return {workType:'COMIC' as WorkType,unclassifiedCount:0};const d=await r.json();if(!r.ok||!workTypeLabels[d.workType as WorkType])throw Error(d.detail||'創作身份讀取失敗');return d;}).then(setData).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[]);
 if(error)return <div className="cw-card" role="alert">{error}<button onClick={()=>window.location.reload()}>重新讀取</button></div>;
 if(!data)return <div className="cw-card" role="status">正在讀取創作身份…</div>;
 return <Context.Provider value={data}>{children}</Context.Provider>;
}
export function WorkTypeTabs({contract=false}:{contract?:boolean}={}){
 const {workType}=useWorkType(),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function select(type:WorkType){if(type===workType||busy)return;if(document.querySelector('[data-upload-busy="true"]')){setError('請先完成或取消正在進行的上傳，再切換創作身份。');return;}if(!window.confirm('切換後將顯示另一類作品。請先保存正在編輯的資料，確認切換？'))return;setBusy(true);setError('');try{const r=await fetch('/api/creator/team/work-type',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({workType:type})});const d=await r.json();if(!r.ok)throw Error(d.detail||'切換失敗');history.replaceState(null,'',contract?'#contracts':'#home');window.location.reload();}catch(e){setError((e as Error).message);setBusy(false);}}
 return <><div className={contract?"rp-contract-types":"ca-work-types"} aria-label={contract?"合同類型":"創作身份"}>{(['SHORT_DRAMA','COMIC'] as WorkType[]).map(type=><button key={type} disabled={busy} aria-pressed={workType===type} onClick={()=>void select(type)}>{workTypeLabels[type]}{contract?"合同":""}</button>)}</div>{error&&<p role="alert" className="ca-error">{error}</p>}</>;
}
