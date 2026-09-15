import type { Metadata } from "next";
import { HeroBackground } from "@/components/prototype/hero-background";

import { JygBusinessCollaboration } from "@/components/prototype/jyg-business-collaboration";
import { getManagedPage } from "@/content/cms/java-cms-client";
import { managedBlock, managedBlockProps, managedBlockStyle } from "@/content/cms/managed-page-style";

export const metadata: Metadata = {
  title: "聯絡我們",
  description: "與劇有梗一起探索 AI 原創娛樂合作新可能。",
};

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export default async function ContactPage() {
  const page = await getManagedPage("/contact", "zh-Hant");
  const heroBlock = managedBlock(page, "hero");
  const contactFormBlock = managedBlock(page, "contact-form");
  const hero = managedBlockProps(page, "hero");
  const contactForm = managedBlockProps(page, "contact-form");
  return (
    <div className="jyg-contact-page">
      <section className="jyg-prototype jyg-contact-hero" data-nav-hero data-nav-hero-centered data-cms-zone="hero" style={managedBlockStyle(heroBlock, { includeBackgroundImage: false, hero: true })}>
        <HeroBackground
          image={text(hero.backgroundUrl, "/cms-media/assets/jyg/contact-hero-global-network-hd.png")}
          alt="AI 原創娛樂角色與未來世界"
          theme="contact"
          position={text(hero.backgroundPosition, "50% 50%")}
          mobilePosition={text(hero.mobileBackgroundPosition, "68% 50%")}
          priority
        />
        <div className="jyg-contact-hero__stars" aria-hidden />
        <div className="jyg-contact-hero__orbit" aria-hidden><i /><i /><i /></div>

        <div className="jyg-shell jyg-contact-hero__grid">
          <div className="jyg-contact-hero__copy" data-nav-hero-copy>
            <h1 data-cms-field="title">{text(hero.title, "聯絡我們")}</h1>
            <h2 data-cms-field="subtitle">{text(hero.subtitle, "與劇有梗一起探索\nAI 原創娛樂合作新可能。")}</h2>
            <p data-cms-field="description">{text(hero.description, "無論是 IP 授權、品牌合作、內容合作或海外市場拓展，\n我們期待與您建立連結。")}</p>
          </div>
        </div>
      </section>

      <JygBusinessCollaboration
        embedded
        heading={text(contactForm.title, "聯絡我們")}
        eyebrow={text(contactForm.eyebrow, "BUSINESS COLLABORATION · 04")}
        description={text(contactForm.description, "串聯原創 IP、品牌與全球市場，\n一起創造下一個娛樂新世界。")}
        cmsZone="contact-form"
        style={managedBlockStyle(contactFormBlock)}
      />
    </div>
  );
}
