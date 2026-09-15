"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, FileText, ImagePlus, LockKeyhole, ShieldCheck, Sparkles, UploadCloud, UserRoundCog } from "lucide-react";

import styles from "./creator-id-application.module.css";

function UploadBox({ label, hint, multiple = false }: { label: string; hint: string; multiple?: boolean }) {
  const [fileName, setFileName] = useState("");
  const onChange = (event: ChangeEvent<HTMLInputElement>) => setFileName(Array.from(event.target.files ?? []).map((file) => file.name).join("、"));
  return <label className={styles.uploadBox}>
    <UploadCloud aria-hidden />
    <strong>{fileName || label}</strong>
    <small>{fileName ? "已選擇，可重新上傳" : hint}</small>
    <input type="file" multiple={multiple} accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf" onChange={onChange} />
  </label>;
}

export function CreatorIdApplication() {
  const [submitted, setSubmitted] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSubmitted(true); };

  if (submitted) return <main className={styles.page}><section className={styles.success}><Check aria-hidden /><p>AI CREATOR ID APPLICATION</p><h1>資料已送出</h1><span>我們會先確認你提供的角色資料，後續透過聯絡方式通知審核結果。</span><Link href="/creator-id">返回 Creator ID 介紹頁 <ArrowRight aria-hidden /></Link></section></main>;

  return <main className={styles.page}>
    <header className={styles.header}>
      <div><p>AI CREATOR ID</p><h1>免費建立 AI Creator ID</h1><span>AI 虛擬人物身分登錄申請</span></div>
      <Link href="/creator-id" className={styles.back}><ArrowLeft aria-hidden />返回介紹頁</Link>
    </header>
    <ol className={styles.steps} aria-label="申請流程"><li className={styles.active}><b>01</b><span>填寫角色資料</span></li><li><b>02</b><span>上傳相關資料</span></li><li><b>03</b><span>提交審核</span></li></ol>
    <form className={styles.layout} onSubmit={submit}>
      <div className={styles.formColumn}>
        <section className={styles.formSection}><h2><UserRoundCog aria-hidden />A. 角色基本資料</h2><p className={styles.sectionHint}>建立 AI 虛擬人物的公開身分，資料通過審核後會產生專屬 Creator ID。</p>
          <div className={styles.contactGrid}>
            <label><span>聯絡人姓名 <em>*</em></span><input name="contactName" autoComplete="name" maxLength={120} required placeholder="請輸入姓名" /></label>
            <label><span>電話 <em>*</em></span><input name="phone" type="tel" autoComplete="tel" maxLength={40} required placeholder="請輸入聯絡電話" /></label>
            <label><span>電子郵箱 <em>*</em></span><input name="email" type="email" autoComplete="email" maxLength={160} required placeholder="請輸入電子郵箱" /></label>
          </div>
          <div className={styles.twoColumn}><label><span>AI 人物名稱 <em>*</em></span><input name="characterName" placeholder="請輸入 AI 人物名稱" required /></label><label><span>AI 人物類型 <em>*</em></span><select name="characterType" defaultValue="" required><option value="" disabled>請選擇類型</option><option>虛擬角色</option><option>AI KOL</option><option>品牌角色</option></select></label></div>
          <label><span>AI 人物簡介 <em>*</em></span><textarea name="characterBio" rows={4} placeholder="請簡要介紹角色設定、個性與創作方向" required /></label>
          <div className={styles.mediaRow}><div><span className={styles.label}>角色形象圖片 <em>*</em></span><UploadBox label="上傳角色形象" hint="JPG、PNG，10MB 以內" /></div><div className={styles.previewTip}><ImagePlus aria-hidden /><b>建議使用清晰正面圖</b><small>圖片會作為平台內身分辨識與公開頁面展示。</small></div></div>
        </section>
        <section className={styles.formSection}><h2><FileText aria-hidden />B. 創作與原創資料</h2><p className={styles.sectionHint}>提供角色的創作來源與使用資料，方便平台確認內容歸屬。</p><UploadBox label="上傳創作相關資料" hint="可上傳草稿、設定稿或創作證明（JPG、PNG、PDF）" multiple /><label><span>創作說明</span><textarea name="creationNote" rows={4} placeholder="請說明角色的創作時間、使用方式或原創來源（選填）" /></label><div className={styles.tagGrid}>{["原創角色", "AI 生成", "品牌合作", "短劇／動畫", "社群內容", "其他"].map((tag) => <label key={tag}><input type="checkbox" name="tags" value={tag} /><span>{tag}</span></label>)}</div></section>
        <section className={styles.formSection}><h2><ShieldCheck aria-hidden />C. 申請前確認</h2><label className={styles.check}><input type="checkbox" required /><span>我確認提供的角色資料為真實，且擁有或已取得使用相關素材的權利。</span></label><label className={styles.check}><input type="checkbox" required /><span>我瞭解 Creator ID 為平台身分登錄與平台內保護，不等同政府認證或法律判定。</span></label></section>
        <button className={styles.submit} type="submit">提交 Creator ID 申請 <ArrowRight aria-hidden /></button>
      </div>
      <aside className={styles.sidebar}><section><h2><Sparkles aria-hidden />申請後可獲得</h2>{["AI Creator ID 專屬編號", "Creator ID 認證標章", "公開驗證頁面"].map((item) => <div className={styles.sideItem} key={item}><Check aria-hidden /><span>{item}<small>完成審核後提供</small></span></div>)}</section><section><h2><LockKeyhole aria-hidden />平台內保護</h2><ul><li>建立角色身分紀錄</li><li>平台內冒用可提出申訴</li><li>支援後續資料補充與更新</li><li>可升級專業權益服務</li></ul></section><section className={styles.help}><h2>需要協助？</h2><p>如果不確定要準備哪些資料，可以先聯絡我們。</p><Link href="/contact">聯絡客服 <ArrowRight aria-hidden /></Link></section></aside>
    </form>
  </main>;
}
