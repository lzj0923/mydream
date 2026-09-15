"use client";
import type { CSSProperties } from "react";

import { LockKeyhole, Mail, ShieldCheck, Ticket, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { registrationEmail, registrationFields } from "@/lib/app-auth/registration";

export function RegisterClient({ backgroundStyle, nextPath }: { backgroundStyle?: CSSProperties; nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState<"code" | "register" | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!remaining) return;
    const timer = setTimeout(() => setRemaining(remaining - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  async function sendCode() {
    if (busy || remaining) return;
    setMessage(""); setNotice("");
    try {
      const normalizedEmail = registrationEmail(email);
      setBusy("code");
      const res = await fetch("/api/account/register/code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: normalizedEmail }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "驗證碼發送失敗");
      setRemaining(60);
      setNotice("驗證碼已發送，請查收郵箱；未收到時請檢查垃圾郵件。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "驗證碼發送失敗，請稍後重試"); }
    finally { setBusy(null); }
  }

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setMessage(""); setNotice("");
    try {
      let deviceId: string;
      try {
        deviceId = localStorage.getItem("md_web_device_id") || `web-${crypto.randomUUID()}`;
        localStorage.setItem("md_web_device_id", deviceId);
      } catch { deviceId = `web-${crypto.randomUUID()}`; }
      const body = { email, code, password, confirmPassword, inviteCode, deviceId };
      registrationFields(body);
      setBusy("register");
      const res = await fetch("/api/account/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "註冊失敗");
      router.replace(`/login?registered=1&next=${encodeURIComponent(nextPath)}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "註冊失敗，請稍後重試"); setBusy(null); }
  }

  return <section data-cms-zone="page-background" style={backgroundStyle} className="account-login-page account-register-page"><div className="account-login-shell">
    <div className="account-login-intro"><h1>一個賬號<br /><b>開啟你的夢想</b></h1><p>註冊 MY DREAM 賬號，在官網與 App 暢享精彩短劇，開啟你的創作旅程。</p><div><UserPlus aria-hidden /><span><b>官網與 App 通用</b><small>使用同一個郵箱和密碼登錄</small></span></div><div><ShieldCheck aria-hidden /><span><b>驗證你的郵箱</b><small>輸入郵箱驗證碼，完成賬號註冊</small></span></div></div>
    <div className="account-login-card"><div className="account-login-card__heading"><h2>註冊 MY DREAM</h2><p>使用郵箱創建賬號</p></div>
      <form onSubmit={register}>
        <label><span>郵箱</span><div><Mail size={18} aria-hidden /><input type="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setCode(""); setNotice(""); }} maxLength={120} placeholder="請輸入郵箱地址" required disabled={Boolean(busy)} /></div></label>
        <label><span>郵箱驗證碼</span><div><ShieldCheck size={18} aria-hidden /><input autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} maxLength={12} placeholder="輸入驗證碼" required disabled={Boolean(busy)} /><button className="account-code-button" type="button" disabled={Boolean(busy) || remaining > 0} onClick={() => void sendCode()}>{busy === "code" ? "發送中…" : remaining ? `${remaining} 秒後重發` : "獲取驗證碼"}</button></div></label>
        <label><span>密碼</span><div><LockKeyhole size={18} aria-hidden /><input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} maxLength={30} placeholder="6–30 個字符，不含空格" required disabled={Boolean(busy)} /></div></label>
        <label><span>確認密碼</span><div><LockKeyhole size={18} aria-hidden /><input type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} minLength={6} maxLength={30} placeholder="請再次輸入密碼" required disabled={Boolean(busy)} /></div></label>
        <label><span>邀請碼（選填）</span><div><Ticket size={18} aria-hidden /><input value={inviteCode} onChange={e => setInviteCode(e.target.value)} maxLength={40} placeholder="如有邀請碼，請填寫" disabled={Boolean(busy)} /></div></label>
        <button type="submit" disabled={Boolean(busy)}>{busy === "register" ? "註冊中…" : "註冊賬號"}</button>
      </form>
      {notice ? <p className="account-register-notice" role="status">{notice}</p> : null}
      {message ? <p className="account-login-error" role="alert">{message}</p> : null}
      <p className="account-register-entry">已有賬號？<Link href={`/login?next=${encodeURIComponent(nextPath)}`}>立即登錄</Link></p>
      <p className="account-login-note">註冊即代表你同意<Link href="/terms">服務條款</Link>與<Link href="/privacy">隱私政策</Link>。</p>
    </div>
  </div></section>;
}
