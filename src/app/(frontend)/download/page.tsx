import Image from "next/image";
import { Apple, ExternalLink, Play, QrCode } from "lucide-react";

import { V2PageHero } from "@/components/v2/page-hero/page-hero";
import { V2SectionHeading } from "@/components/v2/shared/section-heading";
import { getDownloadSettings, getSiteSettings } from "@/content/queries";
import { getManagedPage } from "@/content/cms/java-cms-client";
import { managedBlock, managedBlockStyle } from "@/content/cms/managed-page-style";
import { buildSeoMetadata } from "@/content/seo";
import { v2Assets } from "@/data/v2-assets";
import { GOOGLE_PLAY_APP_URL } from "@/lib/app-links";

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function StoreCard({ platform, store, title, qrUrl, qrAlt }: { platform: "iOS" | "Android"; store: { availability: "available" | "coming-soon" | "temporarily-unavailable"; url?: string }; title: string; description: string; qrUrl?: string; qrAlt: string }) {
  const ready = store.availability === "available" && Boolean(store.url);
  const Icon = platform === "iOS" ? Apple : Play;
  const prefix = platform === "iOS" ? "ios" : "android";
  return (
    <article className={`v2-store-card v2-store-card--download is-${store.availability}`}>
      <div className="v2-store-card__copy"><Icon aria-hidden /><div><span>{platform}</span><h3><a className="v2-store-card__platform-button" href={GOOGLE_PLAY_APP_URL} target="_blank" rel="noopener noreferrer" aria-label={`${title}，前往 Google Play`}><span data-cms-field={`${prefix}Title`}>{title}</span><ExternalLink size={15} aria-hidden /></a></h3><p>點擊立即下載</p></div></div>
      <div className="v2-store-card__qr">{qrUrl ? <Image src={qrUrl} alt={qrAlt} width={230} height={230} unoptimized data-cms-field={`${prefix}QrUrl`} /> : <div className="v2-qr-placeholder" aria-hidden><QrCode /></div>}</div>
      {ready && store.url ? <a href={store.url} rel="noreferrer">前往商店<ExternalLink size={15} aria-hidden /></a> : <span className="v2-store-card__disabled" aria-disabled="true">請掃描上方二維碼</span>}
    </article>
  );
}

export async function generateMetadata() {
  return buildSeoMetadata(await getSiteSettings(), { title: "下載 APP", description: "查看 My Dream iOS 與 Android 的真實開放狀態與安全下載說明。", path: "/download" });
}

export default async function DownloadPage() {
  const [settings, managedPage] = await Promise.all([getDownloadSettings(), getManagedPage("/download", "zh-Hant")]);
  const hero = managedPage?.blocks.find((block) => block.zone === "hero")?.props ?? {};
  const downloads = managedPage?.blocks.find((block) => block.zone === "store-status")?.props ?? {};
  const heroBackground = text(hero.backgroundUrl, v2Assets.backgrounds.download.src);
  const iosQrUrl = text(downloads.iosQrUrl, "");
  const androidQrUrl = text(downloads.androidQrUrl, "");
  return (
    <div className="v2-page v2-download-page">
      <V2PageHero
        eyebrow={text(hero.eyebrow, "MY DREAM APP")}
        title={text(hero.title, "下一個故事，從 My Dream 開始。")}
        subtitle={text(hero.subtitle, "隨時隨地，開啟精彩故事")}
        description={text(hero.description, "選擇你的手機平台，掃描對應二維碼下載 MY DREAM APP。")}
        background={{ ...v2Assets.backgrounds.download, src: heroBackground }}
        breadcrumbs={[{ label: "首頁", href: "/" }, { label: "下載 APP" }]}
        cmsZone="hero"
        style={managedBlockStyle(managedBlock(managedPage, "hero"), { includeBackgroundImage: false, hero: true })}
      />

      <section className="v2-page-section" id="store-status" data-cms-zone="store-status" style={managedBlockStyle(managedBlock(managedPage, "store-status"))}>
        <div className="v2-page-shell">
          <V2SectionHeading index="01" eyebrow={text(downloads.eyebrow, "DOWNLOAD MY DREAM")} title={text(downloads.title, "選擇平台，掃描下載")} description={text(downloads.description, "Android 與 iOS 使用各自的官方下載二維碼。")} cmsFields />
          <div className="v2-store-grid" data-motion="cascade"><StoreCard platform="Android" store={settings.android} title={text(downloads.androidTitle, "Android 下載")} description={text(downloads.androidDescription, "使用 Android 手機掃描此二維碼下載。")} qrUrl={androidQrUrl} qrAlt={text(downloads.androidQrAlt, "MY DREAM Android 下載二維碼")} /><StoreCard platform="iOS" store={settings.ios} title={text(downloads.iosTitle, "iOS 下載")} description={text(downloads.iosDescription, "使用 iPhone 或 iPad 掃描此二維碼下載。")} qrUrl={iosQrUrl} qrAlt={text(downloads.iosQrAlt, "MY DREAM iOS 下載二維碼")} /></div>
        </div>
      </section>


    </div>
  );
}
