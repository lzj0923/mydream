import { heroCssVariables } from "@/content/cms/navigation-hero-settings";
import { NavigationHeroFit } from "@/components/layout/navigation-hero-fit";
import type { Metadata } from "next";

import "../globals.css";
import "./prototype.css";
import "./managed-blocks.css";
import "./navigation-hero.css";
import "./site-refinements.css";
import { ManagedFooter } from "@/components/layout/managed-footer";
import { Navbar } from "@/components/layout/navbar";
import { ConsentBanner } from "@/components/consent/consent-banner";
import { V2PageMotion } from "@/components/v2/motion/page-motion";
import { getManagedShell, navigationHref } from "@/content/cms/java-cms-client";
import { resolveFooterSettings } from "@/content/cms/footer-settings";
import type { CSSProperties } from "react";
import { CmsVisualRuntime } from "@/components/cms/visual-runtime";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "MY DREAM｜AI 原創娛樂平台", template: "%s｜MY DREAM" },
  description: "MY DREAM 以 AI 技術結合原創 IP，打造漫畫、漫劇、動畫、音樂與角色互動的下一代娛樂平台。",
};

export default async function FrontendLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const managedShell = await getManagedShell();
  const managedNavigation = managedShell?.navigations.primary?.items.map((item) => ({
    id: item.id,
    label: item.label,
    href: navigationHref(item),
    target: item.target,
  }));
  const colors = managedShell?.theme.colors as Record<string, unknown> | undefined;
  const radius = managedShell?.theme.radius as Record<string, unknown> | undefined;
  const footerSettings = resolveFooterSettings(managedShell?.config.footer);
  const managedStyle = managedShell ? {
    "--cms-background": typeof colors?.background === "string" ? colors.background : undefined,
    "--cms-surface": typeof colors?.surface === "string" ? colors.surface : undefined,
    "--cms-text": typeof colors?.text === "string" ? colors.text : undefined,
    "--cms-muted": typeof colors?.muted === "string" ? colors.muted : undefined,
    "--cms-accent": typeof colors?.accent === "string" ? colors.accent : undefined,
    "--cms-cyan": typeof colors?.cyan === "string" ? colors.cyan : undefined,
    "--cms-container": typeof managedShell.theme.containerWidth === "number" ? `${managedShell.theme.containerWidth}px` : undefined,
    "--cms-card-radius": typeof radius?.card === "number" ? `${radius.card}px` : undefined,
    "--cms-button-radius": typeof radius?.button === "number" ? `${radius.button}px` : undefined,
  } as CSSProperties : undefined;
  return (
    <html lang="zh-Hant">
      <body style={{...managedStyle,...heroCssVariables(managedShell?.config.navigationHero)} as CSSProperties}>
        <NavigationHeroFit />
        <CmsVisualRuntime apiBase={process.env.NEXT_PUBLIC_CMS_API_URL ?? ""} siteKey={process.env.CMS_SITE_KEY ?? "mydream"} />
        <div className="site-shell">
          <a className="skip-link" href="#main-content">跳到主要內容</a>
          <Navbar items={managedNavigation} />
          <V2PageMotion><main id="main-content">{children}</main></V2PageMotion>
          <ManagedFooter
            initialSettings={footerSettings}
            apiBase={process.env.NEXT_PUBLIC_CMS_API_URL ?? ""}
            siteKey={process.env.CMS_SITE_KEY ?? "mydream"}
          />
          <ConsentBanner />
        </div>
      </body>
    </html>
  );
}
