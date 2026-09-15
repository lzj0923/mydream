"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Clapperboard, PanelsTopLeft, ArrowLeft } from "lucide-react";
import { creatorTypes, entityTypes, verificationLabels, type Verification } from "@/lib/creator-auth/verification";
import "./creator-verification.css";
import { VerificationForm } from "./verification-form";

export function VerificationNotice() {
  const [value,setValue]=useState<Verification|null>(null);
  useEffect(()=>{const controller=new AbortController();fetch("/api/creator/verification",{cache:"no-store",signal:controller.signal}).then(async r=>{if(!r.ok)throw new Error();return r.json();}).then(setValue).catch(()=>{});return ()=>controller.abort();},[]);
  if(value?.state === "APPROVED")return null;
  return <div className="cv-notice" role="status"><span>{value ? verificationLabels[value.state] : "認證狀態確認中"} · 可瀏覽平台與保存草稿，認證通過後可正式發佈。{value?.reviewNote && ` ${value.reviewNote}`}</span><Link href="/creator/verification">查看認證</Link></div>;
}
export function CreatorVerification({initial}:{initial:Verification}) {
  const [type,setType]=useState<"COMIC"|"SHORT_DRAMA"|null>(null);
  const [busy,setBusy]=useState(false);
  const locked=initial.state === "PENDING" || initial.state === "APPROVED";
  return <main className="cv-page"><header className="cv-header"><Link href="/">▮▮ MY DREAM 創作者中心</Link><span>創作者身份認證</span></header><section className="cv-surface"><div className="cv-back">{type&&!locked?<button disabled={busy} onClick={()=>{setType(null);}}><ArrowLeft size={16}/>上一步</button>:initial.state!=="NONE"?<Link href="/creator/workspace">返回工作台</Link>:<Link href="/creator/login">返回登錄</Link>}</div>{locked?<div className="cv-status"><span className={`cv-status-icon ${initial.state.toLowerCase()}`}>✓</span><h1>{verificationLabels[initial.state]}</h1><p>{initial.creatorType&&creatorTypes[initial.creatorType]} · {initial.entityType&&entityTypes[initial.entityType]}</p><p>{initial.state==="PENDING"?"資料已提交，你可以繼續使用平台，審核通過後開啟正式發佈。":"你已完成身份認證，可以正式發佈作品。"}</p><Link className="cv-primary" href="/creator/workspace">進入創作者平台</Link></div>:<><div className="cv-heading"><h1>{type?`${creatorTypes[type]}認證`:"請選擇您的創作身份"}</h1><p>完成個人或企業認證，讓好創作收穫好回報。提交後即可進入平台。</p>{initial.reviewNote&&<p className="cv-error">退回原因：{initial.reviewNote}</p>}</div>{!type?<div className="cv-roles">{(["COMIC","SHORT_DRAMA"] as const).map(role=>{const Icon=role==="COMIC"?PanelsTopLeft:Clapperboard;return <article key={role} className="cv-role"><Icon size={28}/><h2>{creatorTypes[role]}</h2><p>{role==="COMIC"?"創作原創漫劇、動畫及 AI 漫劇，管理作品與創作收益。":"創作原創短劇、劇本及影視作品，跟進製作與發佈。"}</p><button onClick={()=>setType(role)}>立即認證 <span>→</span></button></article>;})}</div>:<VerificationForm creatorType={type} version={initial.version} onBusy={setBusy}/>}</>}</section></main>;
}
