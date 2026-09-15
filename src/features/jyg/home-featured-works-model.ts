import type { Drama, HomePage } from "@/content/types";
import { isPlaceholderMedia } from "@/content/validation";
import { prototypeHomeDramas } from "@/data/jyg-prototype";
import type { CmsContent } from "@/content/cms/java-cms-client";

export type HomeWorkCardItem = {
  slug: string;
  href?: string;
  title: string;
  format: string;
  genre: string;
  genres?: readonly string[];
  episodeLabel: string;
  description: string;
  heat: string;
  image: { src: string; alt: string; width?: number; height?: number };
  isNew?: boolean;
};

export type JygFeaturedWorksModel = {
  source: "cms" | "prototype";
  items: HomeWorkCardItem[];
};

export const jygFeaturedWorksFallback: JygFeaturedWorksModel = {
  source: "prototype",
  items: sortWorksByHeat(prototypeHomeDramas.map((work) => ({
    ...work,
    href: `/works/${work.slug}`,
  }))).slice(0, 12),
};

const supportedFormats = new Set(["AI短劇", "AI漫劇", "AI動畫", "AI漫畫"]);

export function normalizeWorkGenres(value: unknown, fallback = "AI原創") {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[、,，]/)
      : [];
  const genres = [...new Set(values.map((item) => String(item).trim()).filter(Boolean))];
  return genres.length ? genres : [fallback];
}

function toHomeWorkCard(drama: Drama): HomeWorkCardItem {
  const genres = drama.categories.length ? drama.categories : ["AI原創"];
  return {
    slug: drama.slug,
    href: `/drama/${drama.slug}`,
    title: drama.title,
    format: drama.tags.find((tag) => supportedFormats.has(tag)) ?? "AI短劇",
    genre: genres.join(" · "),
    ...(genres.length > 1 ? { genres } : {}),
    episodeLabel: drama.episodes ? `全 ${drama.episodes} 集` : "集數待更新",
    description: drama.synopsis,
    heat: drama.ranking ? `TOP ${drama.ranking}` : "熱門",
    image: drama.poster,
  };
}

function toManagedWorkCard(work: CmsContent): HomeWorkCardItem {
  const genres = normalizeWorkGenres(work.data.genre);
  return {
    slug: work.slug,
    href: String(work.data.href ?? `/works/${work.slug}`),
    title: work.title,
    format: String(work.data.format ?? "AI短劇"),
    genre: genres.join(" · "),
    ...(genres.length > 1 ? { genres } : {}),
    episodeLabel: String(work.data.episodeLabel ?? "集數待更新"),
    description: work.summary ?? String(work.data.description ?? ""),
    heat: String(work.data.heat ?? "熱門"),
    image: {
      src: work.coverUrl ?? String(work.data.imageUrl ?? "/cms-media/video/drama-promo-poster.jpg"),
      alt: String(work.data.imageAlt ?? `${work.title}作品封面`),
    },
    isNew: work.data.isNew === true,
  };
}

// Heat can arrive as a number, a grouped string, or a localized count.
export function workHeatValue(heat: string): number {
  const match = heat.replace(/[,，\s]/g, "").match(/^(\d+(?:\.\d+)?)(萬|万|億|亿|[kKmMwW])?$/);
  if (!match) return -1;
  const unit = match[2]?.toLowerCase();
  const multiplier = unit === "k" ? 1_000 : unit === "m" ? 1_000_000 : ["萬", "万", "w"].includes(unit ?? "") ? 10_000 : ["億", "亿"].includes(unit ?? "") ? 100_000_000 : 1;
  return Number(match[1]) * multiplier;
}

export function sortWorksByHeat(items: HomeWorkCardItem[]): HomeWorkCardItem[] {
  // TOP labels are ranks, not view counts. Preserve their order after known heat.
  return [...items].sort((a, b) => workHeatValue(b.heat) - workHeatValue(a.heat));
}

export function buildJygAllWorksModel({
  dramas,
  managedWorks,
}: {
  dramas: Drama[];
  managedWorks?: CmsContent[] | null;
}): JygFeaturedWorksModel {
  const managedItems = (managedWorks ?? [])
    .filter((work) => work.data.visible !== false)
    .map(toManagedWorkCard);
  const managedSlugs = new Set(managedItems.map((work) => work.slug));
  const dramaItems = dramas
    .filter((drama) => drama.publicationStatus === "published" && !isPlaceholderMedia(drama.poster) && !managedSlugs.has(drama.slug))
    .map(toHomeWorkCard);
  const items = [...managedItems, ...dramaItems];
  return items.length
    ? { source: "cms", items: sortWorksByHeat(items) }
    : { ...jygFeaturedWorksFallback, items: sortWorksByHeat(jygFeaturedWorksFallback.items) };
}

export function buildJygFeaturedWorksModel({
  home,
  dramas,
  managedWorks,
}: {
  home: HomePage;
  dramas: Drama[];
  managedWorks?: CmsContent[] | null;
}): JygFeaturedWorksModel {
  if (managedWorks?.length) {
    const items = managedWorks
      .filter((work) => work.data.visible !== false)
      .map(toManagedWorkCard);
    if (items.length) return { source: "cms", items: sortWorksByHeat(items).slice(0, 12) };
  }
  if (!home.featuredDramaIds.length) return jygFeaturedWorksFallback;

  const byId = new Map(dramas.map((drama) => [drama.id, drama]));
  const selected = [...new Set(home.featuredDramaIds)]
    .map((id) => byId.get(id))
    .filter((drama): drama is Drama => Boolean(
      drama
      && drama.publicationStatus === "published"
      && !isPlaceholderMedia(drama.poster),
    ))
    .map(toHomeWorkCard);

  return selected.length
    ? { source: "cms", items: sortWorksByHeat(selected).slice(0, 12) }
    : jygFeaturedWorksFallback;
}
