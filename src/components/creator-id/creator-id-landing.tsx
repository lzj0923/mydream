import Image from "next/image";
import Link from "next/link";

import { CreatorIdShowcase } from "./creator-id-showcase";
import styles from "./creator-id.module.css";

export function CreatorIdLanding() {
  return (
    <div className={`${styles.page} ${styles.serviceLanding}`} data-page="creator-id-landing">
      <section className={styles.serviceHero} data-nav-hero data-nav-hero-centered="columns" aria-labelledby="creator-id-title">
        <div className={styles.serviceGrid} aria-hidden />
        <div className={styles.shell}>
          <div className={styles.serviceHeroCopy} data-nav-hero-copy>
            <p className={styles.serviceEyebrow} data-cms-field="eyebrow">AI KOL CERTIFICATION</p>
            <p className={styles.serviceKicker} data-cms-field="eyebrow">AI KOL</p>
            <h1 id="creator-id-title" data-cms-field="title">認證與權益保護</h1>
            <p className={styles.serviceSubtitle} data-cms-field="subtitle">先建立 AI 虛擬人物身分，再獲得平台內保護與專業權益支援</p>
            <p className={styles.serviceLead} data-cms-field="description">不只是申請一張證書，而是從身分建立、平台保護、申訴處理，<br />到更完整的專業權益支援，陪伴創作者守護每一份創作成果。</p>
            <div className={styles.serviceHeroActions} data-nav-hero-actions>
              <div className={styles.primaryCtaWrap}>
                <Link className={styles.servicePrimaryButton} href="/creator-id/apply">免費建立 AI Creator ID</Link>
                <Image className={styles.heroZeroBadge} src="/assets/creator-id/ux-hd/zero-yuan-hero-transparent@4x.png" alt="0 元申請" width={256} height={124} unoptimized />
              </div>
              <Link className={styles.serviceSecondaryButton} href="/creator-id/protection">預約專業權益諮詢</Link>
            </div>
          </div>
          <div className={styles.serviceHeroVisual} data-nav-hero-visual aria-label="AI Creator ID 數位身分示意">
            <Image src="/assets/creator-id/ux-hd/hero-character-hologram@2x.png" alt="AI Creator ID 數位身分示意" width={1064} height={576} priority unoptimized />
          </div>
        </div>
      </section>
      <CreatorIdShowcase />
    </div>
  );
}
