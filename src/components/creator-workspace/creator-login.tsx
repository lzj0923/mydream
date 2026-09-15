"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { safeCreatorReturn } from "@/lib/creator-auth/types";
import "./creator-login.css";

export function CreatorLogin({ register = false }: { register?: boolean }) {
  const [mobile, setMobile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || mobile) return;
    const data = new FormData(event.currentTarget);
    if (register && data.get("password") !== data.get("confirm")) { setError("兩次輸入的密碼不一致"); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/creator-auth/${register ? "register" : "login"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ account: data.get("account"), password: data.get("password"), displayName: data.get("displayName"), accepted: data.get("accepted") === "on" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "登錄失敗，請稍後重試");
      window.location.assign(safeCreatorReturn(new URLSearchParams(window.location.search).get("next")));
    } catch (e) { setError(e instanceof Error ? e.message : "服務暫時無法連接"); setBusy(false); }
  }
  return <main className="creator-auth"><Link className="creator-auth-brand" href="/"><span aria-hidden="true">▮▮</span> MY DREAM 創作者中心</Link><div className="creator-auth-stage"><div className="creator-auth-side"/><section className="creator-auth-card"><div className="creator-auth-copy"><h1><em>加入我們</em><br/>讓好創作收穫好回報</h1><p>面向編劇、導演、演員、版權方等創作者個人及機構的一站式創作服務平台</p></div><form className="creator-auth-form" onSubmit={submit}><div className="creator-auth-tabs">{register ? <strong>註冊創作者賬號</strong> : <><button type="button" className={mobile ? "active" : ""} onClick={() => { setMobile(true); setError(""); }}>手機登錄</button><button type="button" className={!mobile ? "active" : ""} onClick={() => { setMobile(false); setError(""); }}>密碼登錄</button></>}</div>{mobile ? <><input aria-label="手機號" placeholder="請輸入手機號" disabled/><div className="creator-auth-code"><input aria-label="驗證碼" placeholder="請輸入驗證碼" disabled/><button type="button" disabled>獲取驗證碼</button></div><p className="creator-auth-note">短信登錄尚未開通，請使用密碼登錄或註冊。</p></> : <><input name="account" aria-label="創作者賬號" placeholder={register ? "設置賬號（4–32 位英文、數字或下劃線）" : "請輸入創作者賬號"} autoComplete="username" required minLength={4} maxLength={32} pattern="[a-zA-Z0-9][a-zA-Z0-9_]{3,31}"/>{register && <input name="displayName" aria-label="暱稱" placeholder="創作者暱稱（選填）" maxLength={80}/>}<input name="password" type="password" aria-label="密碼" placeholder={register ? "設置密碼（8–64 位，包含字母和數字）" : "請輸入密碼"} autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 8 : undefined} maxLength={64}/>{register && <input name="confirm" type="password" aria-label="確認密碼" placeholder="再次輸入密碼" autoComplete="new-password" required maxLength={64}/>}</>}<label className="creator-auth-agreement"><input name="accepted" type="checkbox" required disabled={mobile}/>我已閱讀並同意 <Link href="/terms" target="_blank">用戶協議</Link> 和 <Link href="/privacy" target="_blank">隱私政策</Link></label>{error && <p className="creator-auth-error" role="alert">{error}</p>}<button className="creator-auth-submit" disabled={busy || mobile}>{busy ? "正在處理…" : register ? "註冊並進入" : "登錄"}</button><p className="creator-auth-switch">{register ? "已有創作者賬號？" : "還沒有創作者賬號？"}<Link href={register ? "/creator/login" : "/creator/register"}>{register ? "密碼登錄" : "立即註冊"}</Link></p></form></section><div className="creator-auth-side"/></div></main>;
}
