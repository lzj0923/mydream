/* eslint-disable @next/next/no-img-element -- Editable background nodes must remain mounted for live CMS preview. */
import {aboutPlanProps,planPrefixes,aboutTextPosition} from "@/content/cms/about-plan";
import Link from "next/link";
import { AboutBrandVideo } from "@/components/prototype/about-brand-video";
import { ArrowRight } from "lucide-react";

import { safeFooterHref } from "@/content/cms/footer-settings";
import { getManagedPage, type CmsBlock } from "@/content/cms/java-cms-client";
import { managedBlockStyle, managedFieldStyle } from "@/content/cms/managed-page-style";
import { getSiteSettings } from "@/content/queries";
import { buildSeoMetadata } from "@/content/seo";

export async function generateMetadata() {
  return buildSeoMetadata(await getSiteSettings(), {
    title: "關於我們",
    description: "瞭解 MY DREAM 如何以 AI、原創 IP 與娛樂內容，打造下一代原創娛樂平台。",
    path: "/about",
  });
}

const fallback = {
  hero: {
    eyebrow: "ABOUT US",
    title: "關於 劇有梗",
    subtitle: "AI 原創娛樂平台領者",
    description: "創有梗致力於 AI 技術結合原創 IP，\n打造涵蓋漫畫、動畫、遊戲、音樂與虛擬角色等多元內容，\n建構完整的娛樂生態系，推動原創價值與內容走向國際。",
    actionLabel: "探索我們的故事",
    actionHref: "/universe",
    backgroundUrl: "/assets/jyg/about-hero-original-world-hd.png",
    backgroundPosition: "center 54%",
  },
  story: {
    eyebrow: "BRAND STORY",
    title: "一個夢想，開創娛樂新未來",
    description: "劇有梗從創意與內容平台出發，見證產業快速成長與轉變。\n我們相信，內容的未來不在數量，而在於能否培養具生命價值的原創 IP。\n\n因此，我們致力融合 AI 技術與原創內容，讓更多好故事被創造、被看見、被喜愛。",
    actionLabel: "認識劇有梗",
    actionHref: "/universe",
    backgroundUrl: "/assets/generated/about-brand-story-v2.png",
    backgroundPosition: "center center",
  },
  platform: {
    eyebrow: "OUR ECOSYSTEM",
    title: "多元內容 × AI 技術 × 原創 IP",
    description: "從漫畫、漫劇到動畫與音樂，我們用 AI 技術打造完整的原創娛樂生態。",
    cardOneTitle: "AI 短劇", cardOneDescription: "沉浸式故事娛樂體驗，原創劇情、豐富題材、多元世界觀，體驗 AI 帶來的全新故事風格。", cardOneAction: "立即觀看", cardOneHref: "/#ai-universe", cardOneImageUrl: "/cms-media/assets/v2/creator-stage.webp",
    cardTwoTitle: "AI 教學影片", cardTwoDescription: "從基礎到進階，涵蓋 AI 影像、配音、剪輯、特效等實用教學。", cardTwoAction: "立即學習", cardTwoHref: "/universe?category=tutorial", cardTwoImageUrl: "/cms-media/assets/v2/hero-cinematic.webp",
    cardThreeTitle: "AI 素材庫", cardThreeDescription: "角色、場景、音效、音樂、特效等高品質素材，支持你的創意實現。", cardThreeAction: "立即創作", cardThreeHref: "/universe/prompts", cardThreeImageUrl: "/cms-media/prototype/jyg/ip-worlds.webp",
  },
  join: {
    eyebrow: "FLAGSHIP IP",
    title: "西遊台灣",
    subtitle: "AI 漫畫 × AI 漫劇",
    description: "以經典《西遊記》角色為基礎，結合台灣獨有的人文、文化與奇幻視角，打造兼具東方魅力與現代節奏的原創內容。",
    actionLabel: "探索《西遊台灣》", actionHref: "/ips",
    benefitOneTitle: "創新驅動", benefitOneDescription: "持續探索 AI 技術，開創娛樂新可能。",
    benefitTwoTitle: "原創為本", benefitTwoDescription: "以角色與故事為核心，打造獨特 IP。",
    benefitThreeTitle: "共創共榮", benefitThreeDescription: "支持創作者成長，共建內容生態系。",
    benefitFourTitle: "全球視野", benefitFourDescription: "連結全球市場，傳遞亞洲文化魅力。",
  },
  characters: {
    eyebrow: "OUR IP CHARACTERS",
    title: "原創 IP 角色",
    subtitle: "",
    description: "每一個角色，都擁有自己的故事與靈魂，持續開啟世界觀。",
    cardOneTitle: "孫悟空", cardOneDescription: "桀驁不馴的齊天大聖。", cardOneImageUrl: "/cms-media/prototype/jyg/character-lineup.webp",
    cardTwoTitle: "唐三藏", cardTwoDescription: "心懷慈悲的取經人。", cardTwoImageUrl: "/cms-media/prototype/jyg/character-lineup.webp",
    cardThreeTitle: "豬八戒", cardThreeDescription: "率真重情的天蓬元帥。", cardThreeImageUrl: "/cms-media/prototype/jyg/character-lineup.webp",
    cardFourTitle: "沙悟淨", cardFourDescription: "沉穩可靠的護行者。", cardFourImageUrl: "/cms-media/prototype/jyg/character-lineup.webp",
    cardFiveTitle: "小白龍", cardFiveDescription: "穿梭奇幻世界的龍族角色。", cardFiveImageUrl: "/cms-media/prototype/jyg/character-lineup.webp",
    cardSixTitle: "更多角色", cardSixDescription: "敬請期待更多角色。", cardSixImageUrl: "/cms-media/prototype/jyg/character-lineup.webp",
  },
  banner: {
    eyebrow: "OUR VALUES",
    title: "我們的核心價值",
    description: "讓 AI 在改變娛樂產業，但真正決定企業價值的，始終是原創 IP 與真實連結。",
    backgroundUrl: "/cms-media/prototype/jyg/ip-worlds.webp",
    backgroundPosition: "center 58%",
  },
} as const;

function props(blocks: CmsBlock[], zone: keyof typeof fallback) {
  const block = blocks.find((block) => block.zone === zone);
  if (!block) return { ...fallback[zone] } as Record<string, string>;
  // Published snapshots omit cleared fields. Do not bring deleted copy or media back.
  return { ...Object.fromEntries(Object.keys(fallback[zone]).map(field => [field, ""])), ...block.props } as Record<string, string>;
}

export default async function AboutPage() {
  const page = await getManagedPage("/about", "zh-Hant");
  const blocks = page?.blocks ?? [];
  const heroBlock = blocks.find((block) => block.zone === "hero");
  // Published CMS snapshots omit cleared values; only use fallback copy when
  // no managed hero exists, so clearing a field survives a full page refresh.
  const hero = (heroBlock
    ? Object.fromEntries([...Object.keys(fallback.hero), "backgroundVideoUrl"].map((field) => [field, typeof heroBlock.props[field] === "string" ? heroBlock.props[field] : ""]))
    : fallback.hero) as Record<string, string>;
  const heroStyle = { ...managedBlockStyle(heroBlock, { includeBackgroundImage: false, hero: true }), "--cms-about-hero-height": typeof heroBlock?.style.minHeight === "number" ? `${heroBlock.style.minHeight}px` : undefined };
  const storyBlock = blocks.find(block => block.zone === "story");
  const charactersBlock = blocks.find(block => block.zone === "characters");
  const story = props(blocks, "story");
  const joinBlock = blocks.find(block => block.zone === "join");
  const join = { ...props(blocks, "join"), ...{
    backgroundUrl: typeof joinBlock?.props.backgroundUrl === "string" ? joinBlock.props.backgroundUrl : props(blocks, "banner").backgroundUrl,
    backgroundPosition: typeof joinBlock?.props.backgroundPosition === "string" ? joinBlock.props.backgroundPosition : props(blocks, "banner").backgroundPosition,
  } };
  const characters = props(blocks, "characters");
  const characterPrefixes = ["One", "Two", "Three", "Four", "Five"];

  const plan=aboutPlanProps(blocks.find(block=>block.zone==="platform")?.props);
  const brandVideoUrl = hero.actionHref && /\.(mp4|webm)(\?|$)/i.test(hero.actionHref) ? safeFooterHref(hero.actionHref) : "/video/logo-intro-h264.mp4";


  return <div className="jyg-prototype jyg-about-showcase jyg-about-showcase--reference jyg-about-cinematic jyg-about-exact">
    <section className="jyg-about-exact__hero" data-nav-hero data-nav-hero-centered data-cms-zone="hero" data-align={String(heroBlock?.style.align ?? "")} data-vertical-align={String(heroBlock?.style.verticalAlign ?? "")} style={heroStyle}>
      {/* Keep empty media elements mounted so the editor can add or remove a background without reloading the iframe. */}
      <img src={hero.backgroundUrl || undefined} hidden={!hero.backgroundUrl} data-cms-field="backgroundUrl" alt="MY DREAM AI 原創娛樂世界" fetchPriority="high" />
      <video src={hero.backgroundVideoUrl || undefined} hidden={!hero.backgroundVideoUrl} data-cms-field="backgroundVideoUrl" autoPlay muted loop playsInline aria-hidden="true" />
      <span className="jyg-about-exact__hero-veil" style={{ opacity: typeof heroBlock?.style.overlay === "number" ? heroBlock.style.overlay : undefined }} />
      <div className="jyg-about-exact__hero-copy" data-nav-hero-copy>
        <h1 data-cms-field="title" style={managedFieldStyle(heroBlock, "title")}>{hero.title}</h1><h2 data-cms-field="subtitle" style={managedFieldStyle(heroBlock, "subtitle")}>{hero.subtitle}</h2>
        <p data-cms-field="description" style={managedFieldStyle(heroBlock, "description")}>{hero.description}</p>
        <div><AboutBrandVideo label={!hero.actionLabel || /認識 My Dream|探索我們的故事/.test(hero.actionLabel) ? "認識劇有梗" : hero.actionLabel} videoUrl={brandVideoUrl} /></div>
      </div>
    </section>

    <main className="jyg-about-exact__main">
      <section className="jyg-about-exact__story" data-cms-zone="story" style={managedBlockStyle(storyBlock, { includeBackgroundImage: false })}>
        <img src={story.backgroundUrl || undefined} hidden={!story.backgroundUrl} data-cms-field="backgroundUrl" alt="MY DREAM 品牌故事原創世界" style={{objectPosition:story.backgroundPosition}} />
        <span />
        <div><h2 data-cms-field="title" style={managedFieldStyle(storyBlock, "title")}>{story.title}</h2><p data-cms-field="description" style={{...managedFieldStyle(storyBlock, "description"),whiteSpace:"pre-line"}}>{story.description}</p><AboutBrandVideo label="認識劇有梗" videoUrl={brandVideoUrl} bindCmsFields={false} /></div>
      </section>

      <section className="jyg-about-exact__characters" data-cms-zone="characters" style={{position:"relative",...managedBlockStyle(charactersBlock),...aboutTextPosition(charactersBlock?.props)}}>
        <header><h2 data-cms-field="title" style={managedFieldStyle(charactersBlock,"title")}>{characters.title}</h2><p data-cms-field="subtitle" style={managedFieldStyle(charactersBlock,"subtitle")}>{characters.subtitle}</p><p data-cms-field="description" style={{...managedFieldStyle(charactersBlock,"description"),whiteSpace:"pre-line"}}>{characters.description}</p></header>
        <div className="jyg-about-showcase__characters-grid">
          {characterPrefixes.map((prefix) => <article key={prefix}>
            <img src={characters[`card${prefix}ImageUrl`]||undefined} hidden={!characters[`card${prefix}ImageUrl`]} data-cms-field={`card${prefix}ImageUrl`} alt={characters[`card${prefix}Title`]} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectPosition:characters[`card${prefix}ImagePosition`] || "center center"}} />
            <div><h3 data-cms-field={`card${prefix}Title`}>{characters[`card${prefix}Title`]}</h3><p data-cms-field={`card${prefix}Description`}>{characters[`card${prefix}Description`]}</p></div>
          </article>)}
        </div>
      </section>

      <section className="jyg-about-exact__future" data-cms-zone="platform" style={{...managedBlockStyle(blocks.find(block=>block.zone==="platform")),...aboutTextPosition(plan)}}>
        <div className="jyg-about-exact__future-copy"><h2><span data-cms-field="planningTitle">{plan.planningTitle}</span> <em data-cms-field="planningSubtitle">{plan.planningSubtitle}</em></h2><strong data-cms-field="planningTagline">{plan.planningTagline}</strong><p data-cms-field="planningDescription" style={{whiteSpace:"pre-line"}}>{plan.planningDescription}</p></div>
        <div className="jyg-about-exact__steps"><div>{planPrefixes.map((prefix,index)=><article key={prefix}><img src={plan[`step${prefix}ImageUrl`]||undefined} hidden={!plan[`step${prefix}ImageUrl`]} data-cms-field={`step${prefix}ImageUrl`} alt="" style={{objectPosition:plan[`step${prefix}ImagePosition`]}} /><span>{index+1}</span><div><h3 data-cms-field={`step${prefix}Title`}>{plan[`step${prefix}Title`]}</h3></div></article>)}</div></div>
      </section>
    </main>

    <section className="jyg-about-showcase__final-cta jyg-about-exact__cta" data-cms-zone="join">
      <img src={join.backgroundUrl || undefined} hidden={!join.backgroundUrl} data-cms-field="backgroundUrl" alt="MY DREAM 創作者共創未來" style={{objectPosition:join.backgroundPosition}} />
      <span />
      <div><h2>邀請每一位創作者<br />一起用 AI，開創原創娛樂的新時代</h2><p>原創有梗，同時發揮潛力，讓世界看見你的作品。</p><aside><Link href="/download">加入 My Dream <ArrowRight /></Link></aside></div>
    </section>
  </div>;
}
