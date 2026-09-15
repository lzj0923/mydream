"use client";
import type { CSSProperties } from "react";

import { Apple, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import Script from "next/script";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useRef, useState } from "react";

type Providers = {
  google: { clientId: string } | null;
  facebook: { appId: string } | null;
  apple: { clientId: string; redirectUri: string } | null;
};

type GoogleApi = { accounts: { id: { initialize(options: { client_id: string; callback(value: { credential: string }): void }): void; renderButton(target: HTMLElement, options: Record<string, unknown>): void } } };
type FacebookApi = { init(options: Record<string, unknown>): void; login(callback: (value: { authResponse?: { accessToken?: string } }) => void, options: Record<string, unknown>): void };
type AppleApi = { auth: { init(options: Record<string, unknown>): void; signIn(): Promise<{ authorization?: { id_token?: string; state?: string } }> } };

function deviceId(): string {
  const key = "md_web_device_id";
  const current = window.localStorage.getItem(key);
  if (current) return current;
  const created = `web-${crypto.randomUUID()}`;
  window.localStorage.setItem(key, created);
  return created;
}

export function LoginClient({ backgroundStyle, providers, nextPath, registered = false }: { backgroundStyle?: CSSProperties; providers: Providers; nextPath: string; registered?: boolean }) {
  const router = useRouter();
  const googleTarget = useRef<HTMLDivElement>(null);
  const appleNonce = useRef("");
  const appleState = useRef("");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const finishSocialLogin = useCallback(async (provider: string, payload: Record<string, string>) => {
    setBusy(provider);
    setMessage("");
    try {
      const response = await fetch(`/api/account/social/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, deviceId: deviceId() }),
      });
      const result = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message || "登錄失敗");
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "登錄失敗，請稍後再試");
    } finally {
      setBusy(null);
    }
  }, [nextPath, router]);

  const onPasswordLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("password");
    setMessage("");
    try {
      const response = await fetch("/api/account/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, password }),
      });
      const result = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message || "登錄失敗");
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "登錄失敗，請稍後再試");
    } finally {
      setBusy(null);
    }
  };

  const setupGoogle = () => {
    const google = (window as unknown as { google?: GoogleApi }).google;
    if (!providers.google || !google || !googleTarget.current) return;
    google.accounts.id.initialize({
      client_id: providers.google.clientId,
      callback: ({ credential }) => void finishSocialLogin("google", { credential }),
    });
    google.accounts.id.renderButton(googleTarget.current, { theme: "filled_black", size: "large", width: 320, text: "signin_with" });
  };

  const setupFacebook = () => {
    const facebook = (window as unknown as { FB?: FacebookApi }).FB;
    if (providers.facebook && facebook) facebook.init({ appId: providers.facebook.appId, cookie: true, xfbml: false, version: "v23.0" });
  };

  const loginFacebook = () => {
    const facebook = (window as unknown as { FB?: FacebookApi }).FB;
    if (!facebook) return setMessage("Facebook 登錄服務尚未加載完成");
    setMessage("");
    facebook.login(({ authResponse }) => {
      if (authResponse?.accessToken) void finishSocialLogin("facebook", { accessToken: authResponse.accessToken });
      else setMessage("未完成 Facebook 授權");
    }, { scope: "email" });
  };

  const setupApple = () => {
    const apple = (window as unknown as { AppleID?: AppleApi }).AppleID;
    if (!providers.apple || !apple) return;
    appleNonce.current = crypto.randomUUID();
    appleState.current = crypto.randomUUID();
    apple.auth.init({
      clientId: providers.apple.clientId,
      scope: "name email",
      redirectURI: providers.apple.redirectUri,
      state: appleState.current,
      nonce: appleNonce.current,
      usePopup: true,
    });
  };

  const loginApple = async () => {
    const apple = (window as unknown as { AppleID?: AppleApi }).AppleID;
    if (!apple) return setMessage("Apple 登錄服務尚未加載完成");
    setMessage("");
    try {
      const result = await apple.auth.signIn();
      if (!appleState.current || result.authorization?.state !== appleState.current) throw new Error("Apple 登錄請求已失效，請重新登錄");
      const identityToken = result.authorization?.id_token;
      if (!identityToken) throw new Error("未取得 Apple 身份憑證");
      await finishSocialLogin("apple", { identityToken, nonce: appleNonce.current });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "未完成 Apple 授權");
    }
  };

  return (
    <section data-cms-zone="page-background" style={backgroundStyle} className="account-login-page">
      {providers.google ? <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={setupGoogle} onError={() => setMessage("Google 登錄服務加載失敗，請稍後再試或使用賬號密碼登錄")} /> : null}
      {providers.facebook ? <Script src="https://connect.facebook.net/zh_TW/sdk.js" strategy="afterInteractive" onReady={setupFacebook} onError={() => setMessage("Facebook 登錄服務加載失敗，請稍後再試或使用賬號密碼登錄")} /> : null}
      {providers.apple ? <Script src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/zh_TW/appleid.auth.js" strategy="afterInteractive" onReady={setupApple} onError={() => setMessage("Apple 登錄服務加載失敗，請稍後再試或使用賬號密碼登錄")} /> : null}
      <div className="account-login-shell">
        <div className="account-login-intro">
          <h1>登錄同一個<br /><b>短劇賬號</b></h1>
          <p>你在 MY DREAM App 中使用的賬號，可直接登錄官網。收藏、會員與賬號身份均來自同一套 401 用戶系統。</p>
          <div><ShieldCheck aria-hidden /><span><b>賬號數據不復制</b><small>官網不會另建一套用戶數據庫</small></span></div>
          <div><LockKeyhole aria-hidden /><span><b>安全會話</b><small>登錄 Token 不暴露給瀏覽器腳本</small></span></div>
        </div>

        <div className="account-login-card">
          <div className="account-login-card__heading"><h2>歡迎回來</h2><p>使用手機、郵箱或 App 賬號登錄</p></div>
          {registered ? <p className="account-register-notice" role="status">註冊成功！請使用新賬號的郵箱和密碼登錄。</p> : null}
          <form onSubmit={onPasswordLogin}>
            <label><span>賬號</span><div><Mail size={18} aria-hidden /><input value={account} onChange={(event) => setAccount(event.target.value)} autoComplete="username" placeholder="手機號 / 郵箱 / 用戶名" required /></div></label>
            <label><span>密碼</span><div><LockKeyhole size={18} aria-hidden /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="請輸入密碼" required /></div></label>
            <button type="submit" disabled={Boolean(busy)}>{busy === "password" ? "登錄中…" : "登錄 MY DREAM"}</button>
          </form>

          <p className="account-register-entry">還沒有賬號？<Link href={`/register?next=${encodeURIComponent(nextPath)}`}>立即註冊</Link></p>

          <div className="account-login-divider"><span>或使用第三方賬號</span></div>
          <div className="account-social-login">
            {providers.google ? <div ref={googleTarget} className="account-google-button" aria-label="使用 Google 登錄" /> : <button disabled title="需要配置 Google Web Client ID">G&nbsp; Google 登錄待配置</button>}
            <button type="button" onClick={loginApple} disabled={!providers.apple || Boolean(busy)}><Apple size={18} aria-hidden />Apple 登錄{!providers.apple ? "待配置" : ""}</button>
            <button type="button" onClick={loginFacebook} disabled={!providers.facebook || Boolean(busy)}><b aria-hidden>f</b>Facebook 登錄{!providers.facebook ? "待配置" : ""}</button>
          </div>
          {message ? <p className="account-login-error" role="alert">{message}</p> : null}
          <p className="account-login-note">登錄即代表你同意本站服務條款與隱私政策。</p>
        </div>
      </div>
    </section>
  );
}
