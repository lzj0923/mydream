"use client";

import Link from "next/link";
import { publicNavigation } from "@/lib/navigation/public-items";
import { Download, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { prototypeNavigation } from "@/data/jyg-prototype";
import { resolveFocusTrapDestination, shouldCloseDrawerForViewport } from "@/lib/navigation/focus-trap";
import { BrandLogo } from "@/components/brand/brand-logo";
import { AccountNavAction } from "@/components/account/account-nav-action";

type NavbarItem = { id: string; label: string; href: string; target?: "_self" | "_blank" };

function isCurrent(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href.startsWith("/#")) return false;
  if (href === "/works") return pathname === "/works" || pathname.startsWith("/works/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar({ items = prototypeNavigation }: { items?: readonly NavbarItem[] }) {
  const navigationItems = publicNavigation(items);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // App Router 会复用布局组件；切换导航后若保留上一个页面的滚动位置，
  // 返回 AI 宇宙时会看起来像加载了错误的首屏。每次路径变化都明确回到页面顶部。
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const frame = window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    const mobileViewport = window.matchMedia("(max-width: 1360px)");
    const syncDrawerToViewport = () => {
      setOpen((current) => shouldCloseDrawerForViewport({ open: current, isMobile: mobileViewport.matches }) ? false : current);
    };
    syncDrawerToViewport();
    mobileViewport.addEventListener("change", syncDrawerToViewport);
    window.addEventListener("orientationchange", syncDrawerToViewport);
    return () => {
      mobileViewport.removeEventListener("change", syncDrawerToViewport);
      window.removeEventListener("orientationchange", syncDrawerToViewport);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const trigger = menuButtonRef.current;
    const drawer = drawerRef.current;
    if (!trigger || !drawer) return;

    const backgroundTargets = Array.from(document.querySelectorAll<HTMLElement>(".site-shell > main, .site-shell > footer"));
    const previousInert = backgroundTargets.map((element) => element.inert);
    backgroundTargets.forEach((element) => { element.inert = true; });
    const focusables = () => [trigger, ...Array.from(drawer.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"))];
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      const activeIndex = items.indexOf(document.activeElement as HTMLElement);
      const destination = resolveFocusTrapDestination({ activeIndex, itemCount: items.length, shiftKey: event.shiftKey });
      if (destination === null) return;
      event.preventDefault();
      items[destination]?.focus();
    };

    document.body.classList.add("menu-open");
    window.addEventListener("keydown", onKeyDown);
    trigger.focus({ preventScroll: true });
    return () => {
      document.body.classList.remove("menu-open");
      window.removeEventListener("keydown", onKeyDown);
      backgroundTargets.forEach((element, index) => { element.inert = previousInert[index]; });
      trigger.focus({ preventScroll: true });
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className={`jyg-navbar${scrolled ? " is-scrolled" : ""}`}>
      <nav className="jyg-nav-shell" aria-label="MY DREAM 主要導覽">
        <Link href="/" className="jyg-brand" onClick={close} aria-label="MY DREAM 首頁" data-logo-status="official">
          <BrandLogo className="jyg-brand__logo" priority />
          <span className="jyg-brand__descriptor"><b>AI 原創娛樂平台</b></span>
        </Link>

        <div className="jyg-nav-links">
          {navigationItems.map((item) => (
            <Link key={item.id} href={item.href} target={item.target} aria-current={isCurrent(pathname, item.href) ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </div>

        <div className="jyg-nav-actions">
          <Link className="jyg-nav-action" href="/creator/workspace">創作者中心</Link>
          <AccountNavAction />
          <Link className="jyg-nav-action jyg-nav-action--gold" href="/download"><Download size={15} aria-hidden />下載 APP</Link>
          <button
            ref={menuButtonRef}
            type="button"
            className="jyg-nav-menu"
            aria-controls="jyg-mobile-drawer"
            aria-expanded={open}
            aria-label={open ? "關閉選單" : "開啟選單"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X aria-hidden /> : <Menu aria-hidden />}
          </button>
        </div>
      </nav>

      <div ref={drawerRef} id="jyg-mobile-drawer" className={`jyg-mobile-drawer${open ? " is-open" : ""}`} aria-hidden={!open}>
        {navigationItems.map((item, index) => (
          <Link key={item.id} href={item.href} target={item.target} onClick={close} tabIndex={open ? 0 : -1}>
            <span>{String(index + 1).padStart(2, "0")}</span><b>{item.label}</b><ArrowMark />
          </Link>
        ))}
        <div className="jyg-mobile-actions">
          <Link href="/creator/workspace" onClick={close} tabIndex={open ? 0 : -1}>創作者中心</Link>
          <AccountNavAction mobile onNavigate={close} tabIndex={open ? 0 : -1} />
          <Link className="jyg-mobile-download" href="/download" onClick={close} tabIndex={open ? 0 : -1}><Download size={15} aria-hidden />下載 APP</Link>
        </div>
      </div>
    </header>
  );
}

function ArrowMark() {
  return <span aria-hidden>↗</span>;
}
