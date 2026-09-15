"use client";
import {WorkTypeTabs,useWorkType,workTypeLabels} from "./work-type";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {Building2,Check,ChevronDown,UserRound} from "lucide-react";
import {roleLabel} from "@/lib/creator-team/roles";
import type {Team} from "./company-team";
import "./account-switcher.css";

export function AccountSwitcher({team,name,loggedIn,onLogin,onManage}:{team:Team|null;name:string;loggedIn:boolean;onLogin:()=>void;onManage:()=>void}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const {workType}=useWorkType();
 const enterprise=!!team?.company&&!team.unavailable;
 useEffect(()=>{if(!open)return;const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false);};const escape=(e:KeyboardEvent)=>{if(e.key==="Escape"){setOpen(false);trigger.current?.focus();}};document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape);return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};},[open]);
 async function select(ownerId?:string){
  if(busy)return;setBusy(true);setError("");
  try{const r=await fetch("/api/creator/team/select",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(ownerId?{ownerId,action:"ENTER"}:{action:"PERSONAL"})});const d=await r.json();if(!r.ok)throw Error(d.detail||"切換失敗，請重試");history.replaceState(null,"","#home");window.location.reload();}catch(e){setError(e instanceof Error?e.message:"切換失敗");setBusy(false);}
 }
 const companies=team?.invitations.filter(i=>i.state==="ACTIVE")??[];
 return <div className="ca-switcher" ref={root}><button ref={trigger} className="cw-user" aria-expanded={open} aria-controls="creator-account-options" onClick={()=>{if(!loggedIn){onLogin();return;}setOpen(v=>!v);setError("");}}><span className="cw-avatar">{enterprise?<Building2 size={19}/>:<UserRound size={19}/>}</span><span><b>{enterprise?team?.name:name}</b><small>{loggedIn?(team?.unavailable?"賬號權限已變更":enterprise?`企業賬號 · ${roleLabel(team?.role)}`:"個人賬號"):"登錄開啟創作"}{loggedIn?` · ${workTypeLabels[workType]}`:""}</small></span><ChevronDown size={14}/></button>
 {open&&<div id="creator-account-options" className="ca-dropdown" aria-label="切換賬號"><div className="ca-heading">創作身份</div><WorkTypeTabs/><div className="ca-heading">切換賬號</div>
 {(!team?.company||team.member||team.unavailable)&&<button className="ca-option" disabled={busy} aria-current={!enterprise&&!team?.unavailable?"true":undefined} onClick={()=>{if(!enterprise&&!team?.unavailable){setOpen(false);return;}void select();}}><UserRound size={18}/><span><strong>個人賬號</strong><small>{name}</small></span>{!enterprise&&!team?.unavailable&&<Check size={16}/>}</button>}
 {team?.company&&!team.member&&!team.unavailable&&<button className="ca-option" aria-current="true" onClick={()=>setOpen(false)}><Building2 size={18}/><span><strong>企業賬號</strong><small>{team.name} · 總管理員</small></span><Check size={16}/></button>}
 {companies.map(c=><button key={c.ownerId} className="ca-option" disabled={busy} aria-current={enterprise&&team?.ownerId===c.ownerId?"true":undefined} onClick={()=>{if(enterprise&&team?.ownerId===c.ownerId){setOpen(false);return;}void select(c.ownerId);}}><Building2 size={18}/><span><strong>企業賬號</strong><small>{c.name}</small></span>{enterprise&&team?.ownerId===c.ownerId&&<Check size={16}/>}</button>)}
 {busy&&<p className="ca-message" role="status">正在切換賬號…</p>}{error&&<p className="ca-error" role="alert">{error}</p>}
 <div className="ca-footer"><button onClick={()=>{setOpen(false);onManage();}}>公司與團隊{team?.invitations.some(i=>i.state==="INVITED")&&<i>新邀請</i>}</button><Link href="/creator/login?next=%2Fcreator%2Fworkspace">使用其他賬號登錄</Link></div></div>}
 </div>;
}
