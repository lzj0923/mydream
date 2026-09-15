import {
  InternalHrefSchema,
  type HomePage,
  type MediaAsset,
} from "@/content/types";
import type { CmsPage } from "@/content/cms/java-cms-client";

export type JygHomeHeroModel = {
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  background: MediaAsset;
  backgroundVideo?: string;
  style?: Record<string, string | number>;
};

export const jygHomeHeroFallback: JygHomeHeroModel = {
  eyebrow: "AI + ORIGINAL IP + ENTERTAINMENT",
  title: "當 AI 開始創造故事",
  subtitle: "娛樂產業將重新定義",
  description: "打造全球領先的 AI 原創 IP 娛樂生態系。從世界觀與角色出發，延伸漫畫、漫劇、動畫、音樂與互動體驗。",
  primaryCta: { label: "探索 AI 宇宙", href: "/universe" },
  secondaryCta: { label: "觀看作品", href: "/works" },
  background: {
    src: "/cms-media/assets/jyg/ai-universe-hero-v2.webp",
    alt: "原創東方神話角色與未來城市構成的 AI 內容宇宙",
    isPlaceholder: false,
  },
  // Video is opt-in from the CMS media library. Do not ship a hard-coded
  // homepage video fallback when the editor has not selected one.
  backgroundVideo: undefined,
};

export function buildJygHomeHeroModel(home?: HomePage, managedPage?: CmsPage | null): JygHomeHeroModel {
  const managedHero = managedPage?.blocks.find((block) => block.type === "hero");
  if (managedHero) {
    const props = managedHero.props;
    return {
      eyebrow: String(props.eyebrow ?? jygHomeHeroFallback.eyebrow),
      title: String(props.title ?? jygHomeHeroFallback.title),
      subtitle: String(props.subtitle ?? jygHomeHeroFallback.subtitle),
      description: String(props.description ?? jygHomeHeroFallback.description),
      primaryCta: jygHomeHeroFallback.primaryCta,
      secondaryCta: jygHomeHeroFallback.secondaryCta,
      background: {
        src: String(props.backgroundUrl ?? jygHomeHeroFallback.background.src),
        alt: String(props.backgroundAlt ?? jygHomeHeroFallback.background.alt),
        isPlaceholder: false,
      },
      backgroundVideo: String(props.backgroundVideoUrl ?? "") || undefined,
      style: {
        ...Object.fromEntries(Object.entries(managedHero.style).filter((entry): entry is [string, string | number] => typeof entry[1] === "string" || typeof entry[1] === "number")),
        backgroundPosition: String(props.backgroundPosition ?? "50% 0%"),
        mobileBackgroundPosition: String(props.mobileBackgroundPosition ?? "65% 50%"),
      },
    };
  }
  const hero = home?.visibility === "published" && home.hero.visibility === "published"
    ? home.hero
    : undefined;
  const primaryHref = InternalHrefSchema.safeParse(hero?.ctaHref);
  const secondaryHref = InternalHrefSchema.safeParse(hero?.secondaryCtaHref);

  if (
    !hero?.eyebrow
    || !hero.title
    || !hero.subtitle
    || !hero.description
    || !hero.ctaLabel
    || !primaryHref.success
    || !hero.secondaryCtaLabel
    || !secondaryHref.success
    || !hero.media
    || hero.media.isPlaceholder
  ) return jygHomeHeroFallback;

  return {
    eyebrow: hero.eyebrow,
    title: hero.title,
    subtitle: hero.subtitle,
    description: hero.description,
    primaryCta: {
      label: hero.ctaLabel,
      href: primaryHref.data,
    },
    secondaryCta: {
      label: hero.secondaryCtaLabel,
      href: secondaryHref.data,
    },
    background: hero.media,
    backgroundVideo: undefined,
  };
}
