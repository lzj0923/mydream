"use client";
import { useEffect, useState, type FormEvent } from "react";
import { UserRound, Link2, ShieldCheck } from "lucide-react";
import type { WorkspaceData } from "./types";
import { verificationLabels, type Verification } from "@/lib/creator-auth/verification";
import "./creator-account.css";
import type { CreatorAccount } from "@/lib/creator-auth/types";

export function CreatorAccountSettings({workspace,navigate}:{workspace:WorkspaceData|null;navigate:(section:"profile"|"contracts")=>void}) {
  const [mode,setMode]=useState<"binding"|"unbind"|null>(null);
  const [verification,setVerification]=useState<Verification|null>(null);
  const [copied,setCopied]=useState(false);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{let active=true;fetch("/api/creator/verification",{cache:"no-store"}).then(async r=>{if(r.ok&&active)setVerification(await r.json());}).catch(()=>{});return()=>{active=false;};},[]);
  const [account, setAccount] = useState<CreatorAccount | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; fetch("/api/creator-auth/me", { cache: "no-store" }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.message || "請重新登錄"); if (active) setAccount(data.account); }).catch(e => { if (active) setMessage(e.message); }); return () => { active = false; }; }, []);
  async function action(event: FormEvent<HTMLFormElement>, kind: "binding" | "unbind" | "logout") {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget; const data = new FormData(form);
    setBusy(true); setMessage("");setFailed(false);
    try {
      const response = await fetch(`/api/creator-auth/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ account: data.get("account"), password: data.get("password") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "操作失敗");
      form.reset();
      if (kind === "logout") { window.location.assign("/creator/login"); return; }
      setAccount(result.account);setMode(null); setMessage(kind === "binding" ? "App 賬號驗證成功，現在可以管理視頻和查看收益。" : "已解除 App 綁定。");
    } catch (e) {setFailed(true); setMessage(e instanceof Error ? e.message : "服務暫時不可用"); } finally { setBusy(false); }
  }
  async function copyId(){if(!account)return;try{await navigator.clipboard.writeText(account.id);setCopied(true);}catch{setMessage("複製失敗，請選取賬號 UID 手動複製。");setFailed(true);}}
  return <section className="cw-card ca-account-page">
    <header className="ca-account-heading"><h1 className="cw-page-title">賬號信息</h1><p>管理你的創作者資料、身份認證與 App 賬號。</p></header>
    <section className="ca-account-section"><h3>基本資料</h3><dl className="ca-account-rows">
      <div><dt>賬號頭像</dt><dd><span className="ca-account-avatar"><UserRound size={32}/></span><span className="ca-account-muted">MY DREAM 創作者</span></dd></div>
      <div><dt>賬號暱稱</dt><dd>{workspace?.profile.displayName||account?.displayName||"—"}<button className="ca-account-link" onClick={()=>navigate("profile")}>修改</button></dd></div>
      <div><dt>賬號 UID</dt><dd><span className="ca-account-uid">{account?.id||"—"}</span><button className="ca-account-link" disabled={!account} onClick={()=>void copyId()}>{copied?"已複製":"複製"}</button></dd></div>
      <div><dt>登錄賬號</dt><dd>{account?.username||"正在讀取…"}</dd></div>
    </dl></section>
    <section className="ca-account-section"><h3><ShieldCheck size={18}/>身份認證</h3><dl className="ca-account-rows"><div><dt>認證狀態</dt><dd><span className={verification?.state==="APPROVED"?"ca-account-badge is-approved":"ca-account-badge"}>{verification?verificationLabels[verification.state]:"正在確認認證狀態"}</span><a className="ca-account-link" href="/creator/verification">查看認證資料</a></dd></div></dl><p className="ca-account-hint">認證提交後即可使用平台，審核通過後開啟正式發佈權限。</p></section>
    <section className="ca-account-section"><h3><Link2 size={18}/>App 賬號綁定</h3><dl className="ca-account-rows"><div><dt>綁定狀態</dt><dd><span className={account?.appUserId?"ca-account-badge is-approved":"ca-account-badge"}>{account?.appUserId?"已綁定":"尚未綁定"}</span><button className="ca-account-link" disabled={busy||!account} onClick={()=>{setMode(mode==="binding"?null:"binding");setMessage("");}}>{account?.appUserId?"重新驗證":"綁定 App 賬號"}</button></dd></div>{account?.appUserId&&<><div><dt>App 賬號</dt><dd>{account.appUsername||account.appUserId}<button className="ca-account-link" disabled={busy} onClick={()=>{setMode("unbind");setMessage("");}}>解除綁定</button></dd></div><div><dt>App UID</dt><dd>{account.appUserId}</dd></div></>}</dl>
      <p className="ca-account-hint">綁定關係長期保留。登錄狀態過期時只需重新驗證同一 App 賬號，不需要解除或重複綁定；網絡故障不會清除綁定。</p>
      {mode&&<form className="ca-binding-form" onSubmit={e=>action(e,mode)}><h4>{mode==="binding"?"驗證 App 賬號":"解除 App 綁定"}</h4><p>{mode==="binding"?"請使用 MY DREAM App 用戶賬號和密碼。":"請輸入創作者賬號密碼，確認解除綁定。"}</p><div className="ca-binding-fields">{mode==="binding"&&<label>App 賬號<input name="account" placeholder="輸入 App 賬號" autoComplete="off" required maxLength={120}/></label>}<label>{mode==="binding"?"App 密碼":"創作者密碼"}<input name="password" placeholder="輸入密碼" type="password" autoComplete="off" required maxLength={256}/></label></div>{failed&&message&&<p className="ca-account-error" role="alert">{message}</p>}<div className="ca-binding-actions"><button type="button" className="ca-account-cancel" disabled={busy} onClick={()=>{setMode(null);setMessage("");}}>取消</button><button className="cw-primary" disabled={busy||!account}>{busy?"正在處理…":mode==="binding"?"驗證並綁定":"確認解除"}</button></div></form>}
      {message&&(!mode||!failed)&&<p className={failed?"ca-account-error":"ca-account-success"} role="status">{message}</p>}
    </section>
    <section className="ca-account-section"><h3>創作者資料</h3><dl className="ca-account-rows"><div><dt>擅長題材</dt><dd>{workspace?.profile.specialty||"尚未填寫"}<button className="ca-account-link" onClick={()=>navigate("profile")}>修改</button></dd></div><div><dt>個人介紹</dt><dd>{workspace?.profile.bio||"尚未填寫"}</dd></div><div><dt>合作協議</dt><dd><button className="ca-account-link" onClick={()=>navigate("contracts")}>查看合同</button></dd></div></dl></section>
    <footer className="ca-account-footer"><span>當前使用獨立創作者賬號登錄</span><form onSubmit={e=>action(e,"logout")}><button className="ca-account-cancel" disabled={busy}>退出登錄</button></form></footer>
  </section>;
}
