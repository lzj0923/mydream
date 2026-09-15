"use client";

import { backgroundSettingsPath } from "@/content/cms/background-page-settings";
import {aboutPlanProps,planPrefixes,aboutTextPosition} from "@/content/cms/about-plan";
import { navigationHeroProps } from "@/content/cms/navigation-hero";
import { worksHeroProps } from "@/content/cms/works-page-settings";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { CmsBlock, CmsPage } from "@/content/cms/java-cms-client";
import { managedBlockStyle } from "@/content/cms/managed-page-style";

type PreviewMessage = { type: "cms-visual-preview"; page: CmsPage; activeZone?: string };

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function finite(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function applyBlock(block: CmsBlock, activeZone?: string) {
  const section = document.querySelector<HTMLElement>(`[data-cms-zone="${CSS.escape(block.zone)}"]`);
  if (!section) return;
  if(section.classList.contains("jyg-page-hero--all-works"))block={...block,props:worksHeroProps(block.props)};
  if(section.classList.contains("jyg-about-exact__future"))block={...block,props:aboutPlanProps(block.props)};
  const props = block.props ?? {};
  if(section.classList.contains("jyg-about-exact__characters")) {
    const background = managedBlockStyle(block);
    section.style.backgroundImage = background.backgroundImage ?? "";
    section.style.backgroundPosition = String(background.backgroundPosition ?? "");
    section.style.backgroundSize = String(background.backgroundSize ?? "");
  }
  if(section.classList.contains("jyg-about-exact__characters")||section.classList.contains("jyg-about-exact__future")){
    for(const [key,value] of Object.entries(aboutTextPosition(props)))section.style.setProperty(key,value);
  }
  const isHero = block.type === "hero";
  section.dataset.previewActive = String(activeZone === block.zone);
  if (block.zone === "consumer-rights" || block.zone === "page-background") {
    const background = managedBlockStyle(block);
    section.style.backgroundImage = background.backgroundImage ?? "";
    section.style.backgroundSize = String(background.backgroundSize ?? "");
    section.style.backgroundPosition = String(background.backgroundPosition ?? "");
    return;
  }
  // A route transition can first render the component's fallback copy. If the
  // saved CMS block intentionally removed a text field, that field is absent
  // from props; clear it before applying the remaining managed values.
  section.querySelectorAll<HTMLElement>("[data-cms-field]").forEach((target) => {
    const field = target.dataset.cmsField;
    if (!field || Object.prototype.hasOwnProperty.call(props, field)) return;
    if (section.closest(".jyg-about-exact") && (target instanceof HTMLImageElement || target instanceof HTMLVideoElement)) {
      target.removeAttribute("src");
      target.hidden = true;
      return;
    }
    if (target instanceof HTMLImageElement || target instanceof HTMLAnchorElement) return;
    target.textContent = "";
  });
  for (const [field, value] of Object.entries(props)) {
    const target = section.querySelector<HTMLElement>(`[data-cms-field="${CSS.escape(field)}"]`);
    if (field === "backgroundUrl" && !target) {
      const url = text(value).replace(/["\\]/g, "");
      section.style.backgroundImage = block.zone === "works-library"
        ? managedBlockStyle(block).backgroundImage ?? ""
        : url ? `linear-gradient(rgba(3,8,18,.22),rgba(3,8,18,.42)),url("${url}")` : "";
      section.style.backgroundSize = url ? "cover" : "";
      section.style.backgroundPosition = text(block.props.backgroundPosition);
      continue;
    }
    if (!target) continue;
    if (field.endsWith("Url") && (target instanceof HTMLImageElement || target instanceof HTMLVideoElement)) {
      if (text(value)) {
        target.removeAttribute("srcset");
        target.removeAttribute("sizes");
        target.src = text(value);
        target.hidden = false;
      } else {
        target.removeAttribute("src");
        target.hidden = true;
      }
      continue;
    }
    if (section.classList.contains("jyg-about-exact__hero") && field === "actionLabel" && /認識 My Dream|探索我們的故事/.test(text(value))) { target.textContent = "認識劇有梗"; continue; }
    if (section.classList.contains("jyg-about-exact__hero") && field === "actionHref" && !/\.(mp4|webm)(\?|$)/i.test(text(value))) { target.setAttribute("href", "/video/logo-intro-h264.mp4"); continue; }
    if (field.endsWith("Href") && target instanceof HTMLAnchorElement) {
      const href = text(value).trim();
      if (/^\/(?!\/)[^\\\r\n]*$/.test(href) || /^https?:\/\/[^\s]+$/i.test(href)) target.href = href;
      continue;
    }
    target.textContent = text(value);
  }
  if(section.classList.contains("jyg-about-exact__future"))for(const prefix of planPrefixes){
    const image=section.querySelector<HTMLElement>(`[data-cms-field="step${prefix}ImageUrl"]`);
    if(image)image.style.objectPosition=text(props[`step${prefix}ImagePosition`]);
  }
  if(section.classList.contains("jyg-about-exact__characters"))for(const prefix of planPrefixes){
    const image=section.querySelector<HTMLElement>(`[data-cms-field="card${prefix}ImageUrl"]`);
    if(image)image.style.objectPosition=text(props[`card${prefix}ImagePosition`]) || "center center";
  }
  const title = section.querySelector<HTMLElement>("[data-cms-field=title]");
  const subtitle = section.querySelector<HTMLElement>("[data-cms-field=subtitle]");
  const description = section.querySelector<HTMLElement>("[data-cms-field=description]");
  const eyebrow = section.querySelector<HTMLElement>("[data-cms-field=eyebrow]");
  const background = section.querySelector<HTMLElement>("[data-cms-field=backgroundUrl]");
  const backgroundContainer = background?.closest<HTMLElement>(".jyg-global-hero-background");
  const overlay = section.querySelector<HTMLElement>(".jyg-global-hero-background__overlay, .v2-page-hero__scrim, .jyg-about-showcase__hero-veil, .jyg-about-exact__hero-veil");
  const copy = section.querySelector<HTMLElement>(".jyg-home-hero__copy, .jyg-ai-hub-hero__copy, .jyg-pricing-hero__content, .jyg-news-hero__content, .jyg-contact-hero__copy, .v2-page-hero__copy, .jyg-about-showcase__hero-copy, .jyg-about-exact__hero-copy");
  if (title) { title.style.color = text(block.style.titleColor); title.style.fontSize = finite(block.style.titleFontSize) ? `${finite(block.style.titleFontSize)}px` : ""; }
  if (subtitle) subtitle.style.color = text(block.style.textColor);
  if (description) description.style.color = text(block.style.descriptionColor);
  if (eyebrow) eyebrow.style.color = text(block.style.eyebrowColor);
  // About uses responsive CSS variables for both image and video positioning.
  if (background) background.style.objectPosition = section.classList.contains("jyg-about-exact__hero") ? "" : text(block.props.backgroundPosition);
  if (section.classList.contains("jyg-about-exact__hero")) {
    section.style.setProperty("--cms-about-hero-height", finite(block.style.minHeight) !== undefined ? `${finite(block.style.minHeight)}px` : "");
  }
  section.style.backgroundColor = text(block.style.backgroundColor);
  section.style.minHeight = !isHero && finite(block.style.minHeight) ? `${finite(block.style.minHeight)}px` : "";
  section.style.height = !isHero && finite(block.style.height) ? `${finite(block.style.height)}px` : "";
  section.style.paddingTop = finite(block.style.paddingTop) ? `${finite(block.style.paddingTop)}px` : "";
  section.style.paddingBottom = finite(block.style.paddingBottom) ? `${finite(block.style.paddingBottom)}px` : "";
  section.style.textAlign = ["left", "center", "right"].includes(text(block.style.align)) ? text(block.style.align) : "";
  section.dataset.align = text(block.style.align);
  const verticalAlign = text(block.style.verticalAlign);
  const verticalCss = verticalAlign === "top" ? "flex-start" : verticalAlign === "bottom" ? "flex-end" : verticalAlign === "center" ? "center" : "";
  const contentVerticalCss = verticalAlign === "top" ? "start" : verticalAlign === "bottom" ? "end" : verticalAlign === "center" ? "center" : "";
  const verticalSpacing = finite(block.style.paddingTop) ?? 0;
  section.dataset.verticalAlign = verticalAlign;
  section.style.setProperty("--cms-text-vertical", verticalCss);
  section.style.setProperty("--cms-text-content", contentVerticalCss);
  const titleOffset = Math.min(Math.max(verticalSpacing - 12, 0), 64);
  section.style.setProperty("--cms-text-offset", verticalAlign === "top" ? `${-titleOffset}px` : verticalAlign === "bottom" ? `${titleOffset}px` : "0px");
  section.style.setProperty("--cms-title-offset", block.type === "hero" ? "0px" : verticalAlign === "top" ? `${-titleOffset}px` : verticalAlign === "bottom" ? `${titleOffset}px` : "0px");
  section.style.setProperty("--cms-grid-columns", String(finite(block.style.columns) ?? ""));
  section.style.setProperty("--cms-grid-gap", finite(block.style.gap) !== undefined ? `${finite(block.style.gap)}px` : "");
  section.style.setProperty("--cms-hero-overlay", finite(block.style.overlay) !== undefined ? String(finite(block.style.overlay)) : "");
  section.style.setProperty("--cms-hero-copy-width", finite(block.style.copyWidth) !== undefined ? `${finite(block.style.copyWidth)}px` : "");
  section.style.setProperty("--jyg-hero-position", text(block.props.backgroundPosition));
  section.style.setProperty("--jyg-hero-position-mobile", text(block.props.mobileBackgroundPosition));
  backgroundContainer?.style.setProperty("--jyg-hero-position", text(block.props.backgroundPosition));
  backgroundContainer?.style.setProperty("--jyg-hero-position-mobile", text(block.props.mobileBackgroundPosition));
  if (overlay) overlay.style.opacity = finite(block.style.overlay) !== undefined ? String(finite(block.style.overlay)) : "";
  if (copy) copy.style.maxWidth = finite(block.style.copyWidth) !== undefined ? `${finite(block.style.copyWidth)}px` : "";
}

function applyPage(page: CmsPage, activeZone?: string) {
  document.querySelectorAll<HTMLElement>("[data-cms-zone]").forEach((section) => { section.dataset.previewActive = "false"; });
  page.blocks.forEach((block) => applyBlock(block.zone === "hero" ? { ...block, props: navigationHeroProps(page.path, block.props) } : block, activeZone));
  if (activeZone) document.querySelector<HTMLElement>(`[data-cms-zone="${CSS.escape(activeZone)}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function CmsVisualRuntime({ apiBase, siteKey }: { apiBase: string; siteKey: string }) {
  const pathname = usePathname();
  useEffect(() => {
    let active = true;
    let animationFrame = 0;
    let observer: MutationObserver | undefined;
    let hasDraftPreview = false;
    const observePage = (page: CmsPage, activeZone?: string) => {
      const root = document.getElementById("main-content") ?? document.body;
      const reapply = () => {
        if (!active || !observer) return;
        observer.disconnect();
        applyPage(page, activeZone);
        observer.observe(root, { childList: true, subtree: true });
      };
      observer?.disconnect();
      observer = new MutationObserver(() => {
        cancelAnimationFrame(animationFrame);
        animationFrame = requestAnimationFrame(reapply);
      });
      reapply();
    };
    const receive = (event: MessageEvent<PreviewMessage>) => {
      if (event.origin !== window.location.origin || event.data?.type !== "cms-visual-preview") return;
      hasDraftPreview = true;
      observePage(event.data.page, event.data.activeZone);
    };
    window.addEventListener("message", receive);
    const base = apiBase.replace(/\/$/, "");
    const query = new URLSearchParams({ path: backgroundSettingsPath(pathname) });
    const controller = new AbortController();
    fetch(`${base}/public-api/v1/sites/${encodeURIComponent(siteKey)}/pages?${query}`, { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<CmsPage> : null)
      .then((page) => { if (active && page && !hasDraftPreview) observePage(page); })
      .catch(() => undefined);
    return () => {
      active = false;
      cancelAnimationFrame(animationFrame);
      observer?.disconnect();
      controller.abort();
      window.removeEventListener("message", receive);
    };
  }, [apiBase, siteKey, pathname]);
  return null;
}
