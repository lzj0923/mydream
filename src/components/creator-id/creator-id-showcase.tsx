import Image from "next/image";
import Link from "next/link";
import { Clock3, FileCheck2, ImageIcon, ScanFace, UserRound, UserRoundCog } from "lucide-react";

import styles from "./creator-id-showcase.module.css";

const paths = [
  { image: "/assets/creator-id/ux-hd/top-01-identity@4x.png", number: "01", title: "先建立 AI 人物身分", text: "完成 AI 虛擬人物身分登錄，取得 AI Creator ID，建立您在平台內的專屬身分紀錄。" },
  { image: "/assets/creator-id/ux-hd/top-02-protection@4x.png", number: "02", title: "平台內冒用可申訴", text: "若發現您的 AI 人物遭冒用，可透過申訴管道提交證據，平台將進行比對與查證。" },
  { image: "/assets/creator-id/ux-hd/top-03-upgrade@4x.png", number: "03", title: "需要更完整保護時再升級", text: "如需商標申請協助、證據整理或平台外維權支援，可升級專業方案，強化權利主張依據。" },
] as const;

const submissionItems = [
  { icon: ScanFace, text: "AI 人物名稱" },
  { icon: ImageIcon, text: "人物標準照片" },
  { icon: UserRoundCog, text: "人物基本設定" },
  { icon: Clock3, text: "首次建立或公開時間" },
  { icon: UserRound, text: "創作者或權利人資料" },
  { icon: FileCheck2, text: "可證明創作過程的相關資料" },
] as const;

const freeOutputs = [
  { image: "/assets/creator-id/ux-hd/free-01-creator-id@4x.png", title: "AI Creator ID", text: "專屬編號" },
  { image: "/assets/creator-id/ux-hd/free-02-verified@4x.png", title: "認證標章", text: "可驗證" },
  { image: "/assets/creator-id/ux-hd/free-03-public-page@4x.png", title: "公開驗證頁", text: "可供查證" },
] as const;

const protectionItems = [
  "建立 AI 人物在平台上的身分紀錄與申請時間。",
  "平台審核新上架短劇或影片時，會比對主要角色是否與已認證人物高度相似。",
  "如疑似使用已認證人物，平台可要求上架者補充授權或權利證明。",
  "認證者發現角色在平台內被冒用時，可透過申訴管道提交證據。",
  "平台會比對建立時間、原始素材、發布紀錄及授權資料，再決定是否下架、限制內容或駁回申訴。",
] as const;

const paidServices = [
  { image: "/assets/creator-id/ux-hd/paid-01-clean@4x.png", title: "創作資料整理", text: "協助系統化整理創作過程與原始資料，建立清楚的創作脈絡。" },
  { image: "/assets/creator-id/ux-hd/paid-02-clean@4x.png", title: "證據保存", text: "提供數位檔案保存方案，確保資料完整性與時間戳記。" },
  { image: "/assets/creator-id/ux-hd/paid-03-clean@4x.png", title: "權利歸屬整理", text: "釐清創作參與關係與使用範圍，協助形成權利文件。" },
  { image: "/assets/creator-id/ux-hd/paid-04-clean@4x.png", title: "商標評估", text: "評估 AI 人物名稱、造型或相關元素之商標可行性與風險。" },
  { image: "/assets/creator-id/ux-hd/paid-05-clean@4x.png", title: "商標檢索與申請協助", text: "進行商標檢索、申請流程規劃與文件撰寫協助。" },
  { image: "/assets/creator-id/ux-hd/paid-06-clean@4x.png", title: "合約與法律支援對接", text: "媒合專業法律資源，提供合約審閱與平台外維權支援建議。" },
] as const;

const appealSteps = [
  { image: "/assets/creator-id/ux-hd/appeal-01-clean@4x.png", title: "提交申訴" },
  { image: "/assets/creator-id/ux-hd/appeal-02-id-card.svg", title: "提供認證 ID\n與涉嫌冒用的內容" },
  { image: "/assets/creator-id/ux-hd/appeal-03-clean@4x.png", title: "平台比對雙方\n資料及時間線" },
  { image: "/assets/creator-id/ux-hd/appeal-04-clean@4x.png", title: "要求被申訴方說明\n或提供授權" },
  { image: "/assets/creator-id/ux-hd/appeal-05-clean@4x.png", title: "平台作出下架、限制\n或駁回申訴的處理" },
  { image: "/assets/creator-id/ux-hd/appeal-06-clean@4x.png", title: "雙方收到\n審查結果" },
] as const;

export function CreatorIdShowcase() {
  return (
    <div className={styles.showcase}>
      <section className={styles.pathSection} aria-label="三步理解 AI KOL 認證與權益保護">
        <div className={styles.shell}>
          {paths.map((item) => <article className={styles.pathCard} key={item.number}><Image src={item.image} alt="" width={320} height={296} unoptimized /><div><h2>{item.title}</h2><p>{item.text}</p></div><span>{item.number}</span></article>)}
        </div>
      </section>

      <section className={styles.freeSection} aria-labelledby="free-showcase-title">
        <div className={`${styles.shell} ${styles.freePanel}`}>
          <Image className={styles.ribbon} src="/assets/creator-id/ux-hd/recommended-ribbon-transparent@4x.png" alt="推薦" width={384} height={308} unoptimized />
          <header className={styles.freeHeader}><h2 id="free-showcase-title">AI KOL 平台認證 <strong>｜免費</strong></h2><Image src="/assets/creator-id/ux-hd/zero-yuan-hero-transparent@4x.png" alt="0 元申請" width={256} height={124} unoptimized /><span>平台認證與平台內保護</span></header>
          <div className={styles.freeGrid}>
            <article className={styles.freeCard}><h3>免費提交資料</h3><ul className={styles.submissionList}>{submissionItems.map(({ icon: Icon, text }) => <li key={text}><Icon aria-hidden />{text}</li>)}</ul></article>
            <article className={styles.freeCard}><h3>通過審核後可獲得</h3><div className={styles.outputGrid}>{freeOutputs.map((item) => <div key={item.title}><Image src={item.image} alt="" width={296} height={348} unoptimized /><strong>{item.title}</strong><small>（{item.text}）</small></div>)}</div></article>
            <article className={styles.freeCard}><h3>平台內保護</h3><ol className={styles.protectionList}>{protectionItems.map((item, index) => <li key={item}><span>{index + 1}</span><p>{item}</p></li>)}</ol></article>
          </div>
          <Link className={styles.goldButton} href="/creator-id/apply">免費建立 AI Creator ID</Link>
          <p className={styles.freeNotice}>ⓘ　屬於平台認證與平台內保護，不等同政府認證或直接法律效力。</p>
        </div>
      </section>

      <section className={styles.paidSection} aria-labelledby="paid-showcase-title">
        <div className={`${styles.shell} ${styles.paidPanel}`}>
          <header className={styles.sectionHeader}><h2 id="paid-showcase-title">專業權益保護方案 <strong>｜付費</strong></h2><p>適合希望長期品牌化、商業化，或需要平台外維權支援的創作者。</p></header>
          <div className={styles.paidGrid}>{paidServices.map((item) => <article key={item.title}><Image src={item.image} alt="" width={300} height={252} unoptimized /><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
          <p className={styles.paidNote}>這不是更高級的認證，而是更完整的權利管理與專業支援。</p>
          <Link className={styles.goldButton} href="/creator-id/protection">預約專業權益諮詢</Link>
        </div>
      </section>

      <section className={styles.appealSection} aria-labelledby="appeal-showcase-title">
        <div className={`${styles.shell} ${styles.appealPanel}`}>
          <h2 id="appeal-showcase-title">IP 申訴處理流程</h2>
          <ol className={styles.appealGrid}>{appealSteps.map((item, index) => <li key={item.title}><Image src={item.image} alt="" width={320} height={304} unoptimized /><span>{index + 1}</span><strong>{item.title}</strong>{index < appealSteps.length - 1 ? <Image className={styles.arrow} src="/assets/creator-id/ux-hd/appeal-arrow-clean@4x.png" alt="" width={172} height={128} unoptimized /> : null}</li>)}</ol>
          <p>ⓘ　處理結果將依平台規範、提交資料完整度與關聯情況綜合審查。</p>
        </div>
      </section>

      <section className={styles.summarySection} aria-label="免費與付費方案重點及重要說明">
        <div className={styles.shell}>
          <div className={styles.summaryGrid}>
            <article><Image src="/assets/creator-id/ux-hd/summary-crown-clean@4x.png" alt="" width={260} height={308} unoptimized /><div><h3>免費方案重點</h3><ul><li>建立 AI 虛擬人物身分與 Creator ID</li><li>平台內 IP 保護與申訴機制</li><li>降低門檻，先完成身分登錄</li></ul></div></article>
            <article><Image src="/assets/creator-id/ux-hd/summary-diamond-clean@4x.png" alt="" width={296} height={300} unoptimized /><div><h3>付費方案重點</h3><ul><li>完整權利管理與證據保存</li><li>商標申請協助與平台外維權支援</li><li>強化權利主張依據</li></ul></div></article>
          </div>
          <div className={styles.disclaimer}><Image src="/assets/creator-id/ux-hd/summary-warning-clean@4x.png" alt="" width={184} height={208} unoptimized /><strong>重要說明</strong><p>本平台僅提供創作保護與權益支援服務，不涉及任何保證商標核准或法律結果之承諾。<br />我們專注於協助創作者通過 AI 虛擬人物身分登錄、平台認證、平台 IP 保護、創作證據保存、商標申請協助與專業權益保障，<br />強化權利主張依據，守護您的創作成果。</p></div>
        </div>
      </section>
    </div>
  );
}
