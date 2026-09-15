import type { CSSProperties } from "react";

import type { CmsBlock, CmsPage } from "@/content/cms/java-cms-client";

type ManagedCssProperties = CSSProperties & Record<`--${string}`, string | number | undefined>;

export function managedBlock(page: CmsPage | null | undefined, zone: string) {
  return page?.blocks.find((block) => block.zone === zone);
}

export function managedBlockProps(page: CmsPage | null | undefined, zone: string) {
  return managedBlock(page, zone)?.props ?? {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function managedFieldText(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function finite(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function textOffset(verticalAlign: string, paddingTop: number | undefined) {
  // Keep a visible breathing room inside the section. Using the full section
  // padding here can pull the title outside its card when "top" is selected.
  // Keep a compact 12px breathing room; move the remaining configured spacing.
  const spacing = Math.min(Math.max((paddingTop ?? 0) - 12, 0), 64);
  if (verticalAlign === "top") return `${-spacing}px`;
  if (verticalAlign === "bottom") return `${spacing}px`;
  return "0px";
}

export function managedBlockStyle(
  block: CmsBlock | null | undefined,
  options: { includeBackgroundImage?: boolean; hero?: boolean } = {},
): ManagedCssProperties {
  const props = block?.props ?? {};
  const style = block?.style ?? {};
  const backgroundUrl = text(props.backgroundUrl);
  const backgroundPosition = text(props.backgroundPosition);
  const backgroundColor = text(style.backgroundColor);
  const align = text(style.align);
  const verticalAlign = text(style.verticalAlign);
  const verticalCss = verticalAlign === "top" ? "flex-start" : verticalAlign === "bottom" ? "flex-end" : verticalAlign === "center" ? "center" : undefined;
  const contentVerticalCss = verticalAlign === "top" ? "start" : verticalAlign === "bottom" ? "end" : verticalAlign === "center" ? "center" : undefined;
  const minHeight = finite(style.minHeight);
  const height = finite(style.height);
  const paddingTop = finite(style.paddingTop);
  const paddingBottom = finite(style.paddingBottom);
  const columns = finite(style.columns);
  const gap = finite(style.gap);
  const overlay = finite(style.overlay);
  const copyWidth = finite(style.copyWidth);

  return {
    ...(backgroundColor ? { backgroundColor } : {}),
    ...(options.includeBackgroundImage !== false && backgroundUrl
      ? {
          backgroundImage: `url(${JSON.stringify(backgroundUrl)})`,
          backgroundPosition: backgroundPosition || "center center",
          backgroundSize: "cover",
        }
      : {}),
    ...(!options.hero && minHeight !== undefined ? { minHeight } : {}),
    ...(!options.hero && height !== undefined ? { height } : {}),
    ...(paddingTop !== undefined ? { paddingTop } : {}),
    ...(paddingBottom !== undefined ? { paddingBottom } : {}),
    ...(["left", "center", "right"].includes(align) ? { textAlign: align as CSSProperties["textAlign"] } : {}),
    "--cms-grid-columns": columns,
    "--cms-grid-gap": gap !== undefined ? `${gap}px` : undefined,
    "--cms-text-vertical": verticalCss,
    "--cms-text-content": contentVerticalCss,
    "--cms-text-offset": textOffset(verticalAlign, paddingTop),
    "--cms-title-offset": options.hero ? "0px" : textOffset(verticalAlign, paddingTop),
    "--cms-hero-overlay": overlay,
    "--cms-hero-copy-width": copyWidth !== undefined ? `${copyWidth}px` : undefined,
    "--jyg-hero-position": backgroundPosition || undefined,
    "--jyg-hero-position-mobile": text(props.mobileBackgroundPosition) || undefined,
  };
}

export function managedFieldStyle(block: CmsBlock | null | undefined, field: "title" | "subtitle" | "description" | "eyebrow"): CSSProperties {
  const style = block?.style ?? {};
  const color = field === "title"
    ? text(style.titleColor)
    : field === "description"
      ? text(style.descriptionColor)
      : field === "eyebrow"
        ? text(style.eyebrowColor)
        : text(style.textColor);
  const titleFontSize = field === "title" ? finite(style.titleFontSize) : undefined;
  return {
    ...(color ? { color } : {}),
    ...(titleFontSize !== undefined ? { fontSize: titleFontSize } : {}),
  };
}
