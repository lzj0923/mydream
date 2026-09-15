"use client";

import { CircleDollarSign, LogOut, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type User = { id: number; username: string; email: string | null; mobile: string | null; avatar: string | null; score: number; money: number; vipEndTime: number | null };

export function AccountClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [vipActive, setVipActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/account/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("unauthorized");
        return (await response.json()).user as User;
      })
      .then((nextUser) => {
        setUser(nextUser);
        setVipActive(Boolean(nextUser.vipEndTime && nextUser.vipEndTime > Math.floor(Date.now() / 1000)));
      })
      .catch(() => router.replace("/login?next=/account"))
      .finally(() => setLoading(false));
  }, [router]);

  const logout = async () => {
    await fetch("/api/account/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  if (loading || !user) return <section className="account-profile-page"><div className="account-profile-shell">正在讀取賬號資料…</div></section>;
  return (
    <section className="account-profile-page">
      <div className="account-profile-shell">
        <div className="account-profile-heading"><span>MY DREAM ACCOUNT</span><h1>我的賬號</h1><p>此處顯示的數據與 MY DREAM App 保持一致。</p></div>
        <div className="account-profile-card">
          <div className="account-profile-user"><div>{user.avatar ? <>
            {/* Avatar URLs are selected at runtime by the App account service. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={user.avatar} alt="" />
          </> : <UserRound aria-hidden />}</div><span><b>{user.username}</b><small>{user.email || user.mobile || `用戶 ID ${user.id}`}</small></span><em>{vipActive ? "VIP" : "普通會員"}</em></div>
          <div className="account-profile-stats">
            <div><CircleDollarSign aria-hidden /><span><small>金幣餘額</small><b>{user.money}</b></span></div>
            <div><Sparkles aria-hidden /><span><small>積分</small><b>{user.score}</b></span></div>
            <div><ShieldCheck aria-hidden /><span><small>賬號來源</small><b>MY DREAM App</b></span></div>
          </div>
          <button type="button" onClick={logout}><LogOut size={17} aria-hidden />退出登錄</button>
        </div>
      </div>
    </section>
  );
}
