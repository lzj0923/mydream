"use client";

import { LogIn, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Viewer = { username?: string };

export function AccountNavAction({ mobile = false, onNavigate, tabIndex }: { mobile?: boolean; onNavigate?: () => void; tabIndex?: number }) {
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/account/me", { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok ? (await response.json()).user as Viewer : null)
      .then((user) => setViewer(user))
      .catch(() => undefined);
    return () => controller.abort();
  }, [pathname]);

  const href = viewer ? "/account" : "/login";
  const label = viewer?.username?.trim() || "登錄";
  const className = mobile ? "jyg-mobile-account" : "jyg-nav-action jyg-nav-action--account";
  return <>
    <Link className={className} href={href} onClick={onNavigate} tabIndex={tabIndex}>{viewer ? <UserRound size={15} aria-hidden /> : <LogIn size={15} aria-hidden />}{label}</Link>
  </>;
}
