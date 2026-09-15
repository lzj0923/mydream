import { ConsumerRights } from "@/components/prototype/consumer-rights";
import "./pricing-readable.css";
import Link from "next/link";
import { PurchaseButton } from "./purchase-button";
import type { Metadata } from "next";
import {
  Check,
  Coins,
  Crown,
  Play,
  CalendarDays,
} from "lucide-react";

import { HeroBackground } from "@/components/prototype/hero-background";
import { getManagedPage } from "@/content/cms/java-cms-client";
import { managedBlock, managedBlockProps, managedBlockStyle } from "@/content/cms/managed-page-style";

export const metadata: Metadata = {
  title: "價目表",
  description: "選擇適合你的方案，暢享更多 AI 原創短劇內容。查看 MY DREAM 金幣充值與短劇會員方案。",
};

const coinPlans = [
  { coins: 500, price: "NT$100", label: "入門補充", highlighted: false },
  { coins: 700, price: "NT$280", label: "靈活加值", highlighted: false },
  { coins: 1500, price: "NT$480", label: "人氣方案", highlighted: true },
  { coins: 2500, price: "NT$850", label: "深度暢享", highlighted: false },
] as const;

const membershipPlans = [
  { group: "短期會員", cycle: "7 DAYS", title: "周會員", price: "NT$240", tone: "violet", benefits: ["7 天會員效期", "會員短劇內容觀看權限", "新作更新提醒"] },
  { group: "短期會員", cycle: "30 DAYS", title: "月會員", price: "NT$590", tone: "pink", benefits: ["30 天會員效期", "會員短劇內容觀看權限", "新作更新提醒"] },
  { group: "長期會員", cycle: "90 DAYS", title: "季會員", price: "NT$1390", tone: "blue", benefits: ["90 天會員效期", "會員短劇內容觀看權限", "長期內容更新提醒"] },
  { group: "長期會員", cycle: "365 DAYS", title: "年度會員", price: "NT$4390", tone: "cyan", benefits: ["365 天會員效期", "會員短劇內容觀看權限", "長期內容更新提醒"] },
] as const;

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export default async function TasksPage() {
  const page = await getManagedPage("/tasks", "zh-Hant");
  const hero = managedBlockProps(page, "hero");
  const coins = managedBlockProps(page, "coins");
  const membership = managedBlockProps(page, "membership");
  return (
    <div className="jyg-prototype jyg-tasks-page">
      <section className="jyg-pricing-hero" data-nav-hero data-nav-hero-centered data-cms-zone="hero" style={managedBlockStyle(managedBlock(page, "hero"), { includeBackgroundImage: false, hero: true })}>
        <HeroBackground
          image={text(hero.backgroundUrl, "/cms-media/assets/jyg/pricing-hero-ai-energy-city-hd.png")}
          alt="MY DREAM 藍金科技能量城市"
          theme="pricing"
          position={text(hero.backgroundPosition, "50% 50%")}
          mobilePosition={text(hero.mobileBackgroundPosition, "65% 50%")}
          priority
        />
        <div className="jyg-pricing-hero__particles" aria-hidden><i /><i /><i /><i /><i /><i /></div>
        <div className="jyg-shell jyg-pricing-hero__content">
          <div className="pricing-intro" data-nav-hero-copy>
            <h1 data-cms-field="title">{text(hero.title, "價目表")}</h1>
            <h2 className="jyg-pricing-hero__lead" data-cms-field="subtitle">{text(hero.subtitle, "充值金幣、開通會員，解鎖更多精彩短劇內容")}</h2>
            <p data-cms-field="description">{text(hero.description, "選擇金幣單集解鎖，或於會員期間暢享短劇內容。")}</p>
            <div className="pricing-intro__cards">
              <article className="pricing-intro__card">
                <div className="pricing-intro__card-head"><span className="pricing-intro__icon" aria-hidden="true"><Coins /></span><h2>金幣充值</h2></div>
              </article>
              <article className="pricing-intro__card">
                <div className="pricing-intro__card-head"><span className="pricing-intro__icon" aria-hidden="true"><Crown /></span><h2>短劇會員</h2></div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <main className="jyg-pricing-main">
        <p className="pricing-orders-link"><Link href="/tasks/payment">查看我的購買訂單</Link></p>
        <section className="jyg-pricing-panel jyg-pricing-panel--coins" data-cms-zone="coins" style={managedBlockStyle(managedBlock(page, "coins"))}>
          <header className="jyg-pricing-section-head">
            <span><Coins aria-hidden /></span>
            <div><small data-cms-field="eyebrow">{text(coins.eyebrow, "COIN RECHARGE")}</small><h2 data-cms-field="title">{text(coins.title, "金幣充值")}</h2><p data-cms-field="description">{text(coins.description, "充值金幣，解鎖更多精彩內容與專屬服務")}</p></div>
          </header>
          <div className="jyg-coin-grid">
            {coinPlans.map((plan) => (
              <article className={`jyg-coin-card${plan.highlighted ? " is-highlighted" : ""}`} key={plan.coins}>
                <small>{plan.label}</small>
                <div><strong>{plan.coins}</strong><span>金幣</span></div>
                <p>{plan.price}</p>
                <span className="jyg-coin-card__visual" aria-hidden><Coins /><i /><i /></span>
                <PurchaseButton productId={`coins-${plan.coins}`} price={Number(plan.price.replace("NT$", ""))} title={`${plan.coins} 金幣`} />
              </article>
            ))}
          </div>
        </section>

        <section className="jyg-coin-usage" aria-label="金幣使用說明" data-cms-zone="coin-usage" style={managedBlockStyle(managedBlock(page, "coin-usage"))}>
          <div className="jyg-coin-usage__grid">
            {[{ icon: Play, title: "金幣用途", detail: "可用於觀看短劇" }, { icon: Coins, title: "單集價格", detail: "每集 30 金幣" }, { icon: CalendarDays, title: "使用期限", detail: "一年內有效" }].map(({ icon: Icon, title, detail }) => (
              <article key={title}><span className="jyg-coin-usage__icon" aria-hidden><Icon /></span><div><h3>{title}</h3><p>{detail}</p></div></article>
            ))}
          </div>
        </section>

        <section className="jyg-pricing-panel jyg-pricing-panel--membership" data-cms-zone="membership" style={managedBlockStyle(managedBlock(page, "membership"))}>
          <header className="jyg-pricing-section-head">
            <span><Crown aria-hidden /></span>
            <div><small data-cms-field="eyebrow">{text(membership.eyebrow, "DRAMA MEMBERSHIP")}</small><h2 data-cms-field="title">{text(membership.title, "短劇會員充值")}</h2><p data-cms-field="description">{text(membership.description, "開通會員，暢享海量優質短劇內容")}</p></div>
          </header>
          <div className="jyg-membership-groups" aria-hidden><span>短期會員</span><span>長期會員</span></div>
          <div className="jyg-membership-grid">
            {membershipPlans.map((plan) => (
              <article className={`jyg-membership-card is-${plan.tone}`} key={plan.title}>
                <small className="jyg-membership-card__group">{plan.group}</small>
                <div className="jyg-membership-card__icon"><Crown aria-hidden /><small>{plan.cycle}</small></div>
                <h3>{plan.title}</h3>
                <ul>{plan.benefits.map((benefit) => <li key={benefit}><Check aria-hidden />{benefit}</li>)}</ul>
                <strong>{plan.price}</strong>
                <PurchaseButton productId={`vip-${plan.cycle.split(" ")[0]}`} price={Number(plan.price.replace("NT$", ""))} title={plan.title} />
              </article>
            ))}
          </div>
        </section>

        <section className="jyg-consumer-rights" aria-label="消費者權益說明" data-cms-zone="consumer-rights" style={managedBlockStyle(managedBlock(page, "consumer-rights"))}>
          <ConsumerRights />
        </section>
      </main>
    </div>
  );
}
