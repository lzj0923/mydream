"use client";

import Image from "next/image";
import type { CmsPage } from "@/content/cms/java-cms-client";
import { managedBlockStyle, managedFieldStyle } from "@/content/cms/managed-page-style";
import { defaultProtectionBlocks } from "@/content/cms/protection-page-settings";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileCheck2,
  FileSearch,
  FileText,
  FolderOpen,
  Grid2X2,
  Headphones,
  Info,
  LoaderCircle,
  MessagesSquare,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { type ChangeEvent, type DragEvent, type FormEvent, useRef, useState } from "react";

import { emptyApplicationDetails, emptyRow, detailFields, repeatFields, type ApplicationDetails } from "@/lib/trademark-application";
import { attachmentCategory, attachmentLabel, attachmentTitles, allowedAttachmentCategories, isLinkedAttachment, uploadRule, validateUpload, type AttachmentGroup } from "@/lib/trademark-uploads";
import { TrademarkGoodsPicker } from "./trademark-goods-picker";
import { DetailFields, RepeatedFields } from "./trademark-detail-fields";

import styles from "./professional-rights-page.module.css";

const assetRoot = "/assets/creator-id/professional-rights";

const services: ReadonlyArray<{ image: string; title: string; text: string; expandable?: boolean }> = [
  { image: `${assetRoot}/01_creation_evidence@4x.png`, title: "創作證據整理", text: "整理角色圖像、文字設定、創作過程、生成紀錄、原始檔案與發布紀錄，建立可追溯的創作資料。" },
  { image: `${assetRoot}/04_trademark_evaluation@4x.png`, title: "商標前置評估", text: "評估 AI 人物名稱、IP 名稱、Logo 或品牌標誌是否適合作為商標申請標的，並整理初步保護方向。" },
  { image: `${assetRoot}/03_rights_organization@4x.png`, title: "商標檢索與類別規劃", text: "協助進行近似商標檢索，並依角色未來實際使用方式，規劃適合的商品與服務類別。" },
  { image: `${assetRoot}/05_trademark_application@4x.png`, title: "台灣商標申請協助", text: "協助整理台灣商標申請所需資料、商標圖樣及指定商品／服務內容，並協助準備送件流程。", expandable: true },
  { image: `${assetRoot}/02_evidence_preservation@4x.png`, title: "授權與商業文件", text: "協助整理 AI 人物未來合作、品牌授權、IP 授權、商業使用與相關合作文件需求。" },
  { image: `${assetRoot}/06_legal_support@4x.png`, title: "專業諮詢／侵權應對", text: "如發現疑似侵權或發生權利爭議，提供初步流程諮詢，必要時協助對接律師、公證人或其他相關專業人員。" },
] as const;

const processSteps = [
  { icon: MessagesSquare, title: "權益需求評估", text: "確認角色名稱、Logo、IP 名稱、品牌標誌與未來商業使用範圍。" },
  { icon: FolderOpen, title: "資料準備", text: "準備申請人資料、商標圖樣、角色／品牌資料與使用方向。" },
  { icon: FileSearch, title: "商標檢索與類別規劃", text: "進行近似商標初步檢索、類別規劃與風險初步說明。" },
  { icon: ClipboardCheck, title: "確認申請方案", text: "確認申請圖樣、商品／服務範圍、政府規費與平台服務項目。" },
  { icon: Send, title: "正式送件與案件追蹤", text: "依確認資料準備台灣商標申請文件、完成送件並記錄案件資訊。" },
  { icon: BadgeCheck, title: "審查／補正／核准後維護", text: "協助掌握審查、補正、意見陳述、註冊程序與後續維護提醒。" },
] as const;

const benefits = [
  "專人協助整理權益資料",
  "商標申請前檢索與類別規劃",
  "台灣商標申請資料協助",
  "創作證據與權利歸屬整理",
  "授權／商業文件需求整理",
  "必要時協助對接專業人員",
] as const;

const trademarkMaterials = [
  ["申請人身分", "申請人姓名，或公司／組織名稱。"],
  ["申請人基本資料", "地址、國籍及必要聯絡資料。"],
  ["商標圖樣", "AI 人物名稱、品牌名稱、Logo、圖形標誌或文字＋圖形組合。"],
  ["商標名稱", "預計申請並對外使用的文字或名稱。"],
  ["商品／服務", "例如數位娛樂、影片、短劇、虛擬人物服務、服飾、公仔、周邊、零售、廣告或娛樂服務；實際類別仍需個案評估。"],
  ["委任資料", "如委任代理人，依案件情況準備相關委任資料。"],
  ["優先權資料", "如主張優先權，再準備相應證明文件。"],
] as const;

const usageOptions = [
  ["short-drama", "短劇"], ["animation", "動畫"], ["ai-kol", "AI KOL"], ["entertainment-services", "娛樂服務"],
  ["social-content", "社群內容"], ["advertising-cooperation", "廣告合作"], ["app-software", "APP／軟體"],
  ["digital-products", "數位商品"], ["apparel", "服飾"], ["figurines-toys", "公仔／玩具"],
  ["merchandise", "周邊商品"], ["online-retail", "線上零售"], ["education-courses", "教育／課程"], ["other", "其他"],
] as const;

const formSteps = ["商標資料", "使用範圍", "申請人資料", "文件確認"] as const;

const documentUploads = [
  ["document-trademark", "商標 Logo／圖樣"],
  ["document-character", "AI 人物標準圖"],
  ["document-brand-use", "品牌使用畫面／社群截圖"],
  ["document-foreign", "國外申請證明（如有）"],
  ["document-other", "其他說明文件"],
  ["document-identity", "身分／法人證明"],
  ["document-evidence", "使用識別性證據／商品型錄"],
  ["document-signature", "申請人／代表人／代理人簽章"],
] as const;

const helpCards = [
  { icon: Search, title: "商標檢索初步評估", text: "針對相同／近似商標進行初步檢索，協助評估可能風險與後續方向。" },
  { icon: Grid2X2, title: "商品／服務類別規劃", text: "依據使用範圍協助規劃適合的商品／服務類別與申請策略。" },
  { icon: FileCheck2, title: "申請資料完整度確認", text: "檢視申請資料與文件完整度，提供後續補件與資料準備指引。" },
  { icon: Headphones, title: "後續申請與送件協助", text: "完成預審後，再依確認內容協助後續正式申請準備與流程諮詢。" },
] as const;

type UploadItem = { category: string; file: File };

function FileUploadCard({ field, title, files, onChange, wide = false }: {
  field: string;
  title?: string;
  files: UploadItem[];
  onChange: (files: UploadItem[]) => void;
  wide?: boolean;
}) {
  const [fileError, setFileError] = useState("");
  const rule = uploadRule(field);

  const addFiles = (incoming: File[]) => {
    const accepted = incoming.filter((file) => validateUpload(file, field));
    if (accepted.length !== incoming.length) setFileError(rule.hint);
    else setFileError("");
    if (files.length + accepted.length > (wide ? 3 : 1)) setFileError(`此欄最多 ${wide ? 3 : 1} 個檔案，請先移除舊檔。`);
    onChange([...files, ...accepted.map((file) => ({ category: field, file }))].slice(0, wide ? 3 : 1));
  };

  const onInput = (event: ChangeEvent<HTMLInputElement>) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; };
  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    addFiles(Array.from(event.dataTransfer.files));
  };

  return <div className={wide ? styles.wideUpload : styles.documentUpload}>
    {title ? <strong>{title}</strong> : null}
    <label onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
      <UploadCloud aria-hidden />
      <span>{wide ? "點擊上傳或拖曳檔案至此" : "點擊上傳"}</span>
      <small>{rule.pdfOnly ? rule.hint : wide ? "支援 JPG、PNG、PDF（最多 10MB）\n建議上傳清晰、無背景之圖樣" : "JPG · PNG · PDF\n（10MB 以內）"}</small>
      <input type="file" aria-label={title ?? "商標圖樣"} accept={rule.accept} multiple={wide} onChange={onInput} />
    </label>
    {files.map(({ file }, index) => <div className={styles.fileItem} key={`${file.name}-${file.lastModified}`}>
      <FileText aria-hidden /><span><b>{file.name}</b><small>{(file.size / 1024).toFixed(0)} KB · 已就緒</small></span>
      <button type="button" aria-label={`刪除 ${file.name}`} onClick={() => onChange(files.filter((_, itemIndex) => itemIndex !== index))}><Trash2 aria-hidden /></button>
    </div>)}
    {fileError ? <p className={styles.fileError} role="alert">{fileError}</p> : null}
  </div>;
}

function ConsultationModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState(emptyApplicationDetails);
  const [summary, setSummary] = useState<[string, string][]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ consultationId: string } | null>(null);
  const [trademarkType, setTrademarkType] = useState("");
  const [foreignApplication, setForeignApplication] = useState("");
  const [priorityClaim, setPriorityClaim] = useState("");
  const [usageScopes, setUsageScopes] = useState<string[]>([]);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [confirmationAccepted, setConfirmationAccepted] = useState(false);
  const [preReviewAccepted, setPreReviewAccepted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const updateDetails = (next: ApplicationDetails) => {
    setDetails(next);
    const allowed = allowedAttachmentCategories(next);
    setUploads((current) => current.filter((item) => !isLinkedAttachment(item.category) || allowed.has(item.category)));
  };
  const filesFor = (field: string) => uploads.filter((item) => item.category === field);
  const updateFiles = (field: string, fieldFiles: UploadItem[]) => setUploads((current) => [
    ...current.filter((item) => item.category !== field),
    ...fieldFiles,
  ]);

  const renderAttachments = (group: AttachmentGroup) => function LinkedAttachments(row: Record<string, string>) { return <div className={styles.linkedAttachments}>
    {[false, true].map((translation) => {
      const field = attachmentCategory(group, row.attachmentId, translation);
      return <FileUploadCard key={field} field={field} title={attachmentTitles[group][translation ? 1 : 0]} files={filesFor(field)} onChange={(files) => updateFiles(field, files)} />;
    })}
    {group !== "agents" ? <p>證明文件與中文譯本請分別上傳，若有多筆優先權，請附於各筆聲明下方。</p> : null}
  </div>; };
  const goToStep = (next: number) => {
    setError("");
    setStep(next);
    if (next === 3 && formRef.current) {
      const form = formRef.current;
      const fields = Array.from(form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input[name], textarea[name], select[name]"));
      setSummary(fields.filter((el) => el.type !== "file" && el.type !== "checkbox" && (el.type !== "radio" || (el instanceof HTMLInputElement && el.checked)) && el.value).map((el) => [({ priorityClaimChoice: "優先權聲明", exhibitionClaim: "展覽會優先權聲明" } as Record<string, string>)[el.name] ?? el.closest("label")?.querySelector("span")?.textContent ?? el.closest("fieldset")?.querySelector("legend")?.textContent ?? el.name, el.type === "radio" ? el.closest("label")?.querySelector("strong")?.textContent ?? el.closest("label")?.textContent ?? el.value : el instanceof HTMLSelectElement ? el.selectedOptions[0]?.text ?? el.value : el.value]));
    }
    requestAnimationFrame(() => formRef.current?.closest("[role=dialog]")?.parentElement?.scrollTo({ top: 0, behavior: "smooth" }));
  };
  const validateStep = (index: number) => {
    const section = formRef.current?.querySelectorAll<HTMLElement>("[data-section]")[index];
    const invalid = Array.from(section?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea") ?? []).find((el) => !el.checkValidity());
    let message = invalid ? "請完成本步驟必填欄位並檢查格式。" : "";
    if (index === 0 && (!trademarkType || !foreignApplication || !priorityClaim || !filesFor("trademarkImage").length)) message = "請完成商標類型、國外申請、優先權選項並上傳商標圖樣。";
    if (index === 0 && priorityClaim === "yes" && !details.priorities.length) message = "請新增並填寫優先權聲明。";
    if (index === 1 && (!details.goods.length || details.goods.some((row) => !row.names.trim()))) message = "請從目錄選擇商品／服務，或加入自訂名稱。";
    if (index === 1 && !usageScopes.length) message = "請至少選擇一項使用範圍。";
    if (index === 1 && new Set(details.goods.map((row) => row.class.padStart(3, "0"))).size !== details.goods.length) message = "同一類商品請合併填寫。";
    const nativeValues = formRef.current ? new FormData(formRef.current) : null;
    if (index === 2 && nativeValues?.get("nationality") === "other" && !details.fields.nationalityOther.trim()) message = "請填寫其他國籍的國家名稱。";
    if (index === 2 && nativeValues?.get("applicantType") !== "individual" && !details.fields.representativeChinese.trim()) message = "請填寫法人／商號代表人中文姓名。";
    if (message) { goToStep(index); setError(message); requestAnimationFrame(() => invalid?.reportValidity()); return false; }
    return true;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (step < 3) { if (validateStep(step)) goToStep(step + 1); return; }
    for (let index = 0; index < 3; index++) if (!validateStep(index)) return;
    const body = new FormData(event.currentTarget);
    body.set("applicationDetails", JSON.stringify(details));
    if (uploads.reduce((sum, item) => sum + item.file.size, 0) > 100 * 1024 * 1024) {
      setError("附件合計不可超過 100MB，請壓縮或移除不需要的文件。");
      return;
    }
    if (!trademarkType || !foreignApplication || !priorityClaim || !usageScopes.length) {
      setError("請完成商標資料與至少一項預計使用範圍。");
      return;
    }
    if (!filesFor("trademarkImage").length) {
      setError("請上傳商標圖樣。");
      return;
    }
    if (!confirmationAccepted || !preReviewAccepted) {
      setError("請確認送出前的兩項聲明。");
      return;
    }
    body.set("trademarkType", trademarkType);
    body.set("foreignApplication", foreignApplication);
    body.set("priorityClaim", priorityClaim);
    body.delete("usageScopes");
    usageScopes.forEach((scope) => body.append("usageScopes", scope));
    body.set("confirmationAccepted", "true");
    body.set("preReviewAccepted", "true");
    uploads.forEach(({ category, file }) => {
      body.append("uploadedFiles", file);
      body.append("fileCategories", category);
    });
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/pre-reviews", { method: "POST", body });
      const data = await response.json().catch(() => ({})) as { consultationId?: string; error?: string };
      if (!response.ok || !data.consultationId) throw new Error(data.error || "目前無法送出諮詢需求，請稍後再試。");
      setResult({ consultationId: data.consultationId });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "目前無法送出諮詢需求，請稍後再試。");
    } finally {
      setSubmitting(false);
    }
  };

  return <div className={styles.modalBackdrop} role="presentation">
    <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="consultation-modal-title">
      <button className={styles.modalClose} type="button" onClick={onClose} aria-label="關閉"><X aria-hidden /></button>
      {result ? <div className={styles.successPanel}>
        <CheckCircle2 aria-hidden />
        <p>TAIWAN TRADEMARK PRE-REVIEW</p>
        <h2 id="consultation-modal-title">商標申請預審資料已送出</h2>
        <span>我們會先確認您提交的商標資料與預計使用範圍，<br />後續將透過您留下的聯絡方式與您聯繫。</span>
        <dl><div><dt>預審編號</dt><dd>{result.consultationId}</dd></div><div><dt>目前狀態</dt><dd>待資料確認</dd></div></dl>
        <button type="button" onClick={onClose}>返回專業權益保護方案</button>
      </div> : <>
        <header className={styles.modalHeader}>
          <div className={styles.modalTitle}><Award aria-hidden /><div><h2 id="consultation-modal-title">專業權益需求評估</h2><h3>台灣商標申請資料預審</h3></div></div>
          <p>填寫以下資料後，我們會先協助確認商標內容、申請人資料與預計使用範圍，<br />再進行商標檢索、類別規劃及申請諮詢。此表為申請前資料預審，不代表已正式向經濟部智慧財產局送件。</p>
        </header>
        <ol className={styles.modalSteps}>{formSteps.map((stepName, index) => <li className={index === step ? styles.activeStep : undefined} key={stepName}><button type="button" aria-current={index === step ? "step" : undefined} disabled={submitting} onClick={() => goToStep(index)}><span>{String(index + 1).padStart(2, "0")}</span>{formSteps[index]}</button></li>)}</ol>
        <form ref={formRef} className={styles.consultationForm} noValidate onSubmit={submit}>
          <div className={styles.modalColumns}>
            <main className={styles.preReviewForm}>
              <section className={styles.formSection} data-section="trademark" hidden={step !== 0}><h3><FileSearch aria-hidden />A. 商標資料</h3>
                <label className={styles.fieldFull}><span>AI 人物／IP 名稱 *</span><input name="ipName" maxLength={120} placeholder="例如：My Dream AI" required /></label>
                <fieldset className={styles.fieldFull}><legend>申請商標類型 *</legend><div className={styles.choiceCards}>
                  {[["word", "純文字商標"], ["logo", "Logo／圖形商標"], ["combined", "文字＋Logo組合"]].map(([value, label]) => <label key={value}><input type="radio" name="trademarkTypeChoice" value={value} checked={trademarkType === value} onChange={() => setTrademarkType(value)} />{label}</label>)}
                </div></fieldset>
                <div className={styles.trademarkGrid}>
                  <label><span>商標名稱 *</span><input name="trademarkName" maxLength={160} placeholder="請輸入商標名稱" required /></label>
                  <div className={styles.trademarkUpload}><span>商標圖樣 *</span><FileUploadCard field="trademarkImage" wide files={filesFor("trademarkImage")} onChange={(files) => updateFiles("trademarkImage", files)} /></div>
                  <fieldset><legend>圖樣顏色</legend><div className={styles.inlineChoices}><label><input type="radio" name="trademarkColor" value="black-white" required />黑白</label><label><input type="radio" name="trademarkColor" value="color" />彩色</label></div></fieldset>
                  <fieldset><legend>是否曾於其他國家提出申請</legend><div className={styles.inlineChoices}><label><input type="radio" name="foreignApplicationChoice" value="yes" checked={foreignApplication === "yes"} onChange={() => setForeignApplication("yes")} />是</label><label><input type="radio" name="foreignApplicationChoice" value="no" checked={foreignApplication === "no"} onChange={() => setForeignApplication("no")} />否</label></div></fieldset>

                </div>
                {foreignApplication === "yes" ? <div className={styles.dynamicFields}><label><span>申請國家／地區 *</span><input name="foreignApplicationCountries" maxLength={240} required /></label><label><span>申請日期 *</span><input type="date" name="foreignApplicationDate" required /></label><label><span>申請案號（如有）</span><input name="foreignApplicationNumber" maxLength={120} /></label><FileUploadCard field="foreignApplicationFile" title="國外申請相關資料" files={filesFor("foreignApplicationFile")} onChange={(files) => updateFiles("foreignApplicationFile", files)} /></div> : null}
                <fieldset className={styles.priorityDeclaration}><legend>優先權聲明 *</legend><p>在國外有先申請或已註冊的商標，才需要主張優先權哦！</p><div className={styles.claimChoices}><label><input type="radio" name="priorityClaimChoice" value="no" checked={priorityClaim === "no"} onChange={() => { setPriorityClaim("no"); updateDetails({ ...details, priorities: [] }); }} /><strong>不主張</strong><span>初次申請此案件者</span></label><label><input type="radio" name="priorityClaimChoice" value="yes" checked={priorityClaim === "yes"} onChange={() => { setPriorityClaim("yes"); if (!details.priorities.length) updateDetails({ ...details, priorities: [emptyRow("priorities")] }); }} /><strong>主張</strong><span>此案件已在國外有先申請或取得合法商標者</span></label></div></fieldset>
                <DetailFields section="trademark" value={details} onChange={updateDetails} />
                {priorityClaim === "yes" ? <RepeatedFields group="priorities" title="優先權聲明" value={details} onChange={updateDetails} renderAttachments={renderAttachments("priorities")} /> : null}
                <RepeatedFields group="exhibitions" title="展覽會優先權聲明" value={details} onChange={updateDetails} renderAttachments={renderAttachments("exhibitions")} />
                {priorityClaim === "yes" ? <p className={styles.fieldNotice}><Info aria-hidden />後續將由專業人員確認是否符合優先權主張條件及所需證明文件。</p> : null}
              </section>

              <section className={styles.formSection} data-section="usage" hidden={step !== 1}><h3><Grid2X2 aria-hidden />B. 預計使用範圍 <small>我們將依您選擇的使用範圍，協助進行商品／服務類別規劃。</small></h3>
                <TrademarkGoodsPicker value={details.goods} onChange={(goods) => updateDetails({ ...details, goods })} /><div className={styles.scopeGrid}>{usageOptions.map(([value, label]) => <label key={value}><input type="checkbox" value={value} checked={usageScopes.includes(value)} onChange={(event) => setUsageScopes((current) => event.target.checked ? [...current, value] : current.filter((item) => item !== value))} />{label}</label>)}</div>
                {usageScopes.includes("other") ? <label className={styles.otherScope}><span>其他使用範圍</span><input name="usageScopeOther" maxLength={200} required /></label> : null}
                <label className={styles.fieldFull}><span>補充說明（預計實際使用方式）</span><textarea name="usageDescription" maxLength={300} rows={3} placeholder="請說明預計實際使用的情境、平台、內容或服務方式等（選填）" /></label>
              </section>

              <section className={styles.formSection} data-section="applicant" hidden={step !== 2}><h3><FileCheck2 aria-hidden />C. 申請人資料</h3>
                <fieldset className={styles.applicantType}><legend>申請人類型 *</legend><div className={styles.inlineChoices}><label><input type="radio" name="applicantType" value="individual" required />自然人</label><label><input type="radio" name="applicantType" value="company" />法人／公司／機關／學校</label><label><input type="radio" name="applicantType" value="team" />商號／行號／工廠</label></div></fieldset>
                <div className={styles.applicantGrid}>
                  <label><span>申請人中文姓名／名稱 *</span><input name="applicantChineseName" maxLength={160} placeholder="請輸入中文姓名或公司名稱" required /></label>
                  <label><span>英文姓名／名稱</span><input name="applicantEnglishName" maxLength={160} placeholder="請輸入英文姓名或公司名稱（選填）" /></label>
                  <label><span>國籍／地區 *</span><span className={styles.selectWrap}><select name="nationality" required defaultValue=""><option value="" disabled>請選擇國籍或地區</option><option value="TW">台灣</option><option value="CN">中國大陸</option><option value="HK">香港</option><option value="MO">澳門</option><option value="other">其他</option></select><ChevronDown aria-hidden /></span></label>
                  <label><span>聯絡人姓名 *</span><input name="contactName" maxLength={120} placeholder="請輸入聯絡人姓名" required /></label>
                  <label><span>Email *</span><input name="email" type="email" maxLength={160} placeholder="請輸入 Email" required /></label>
                  <label><span>手機／聯絡方式 *</span><input name="phone" maxLength={160} placeholder="請輸入手機號碼" required /></label>
                  <label><span>中文地址 *</span><input name="address" required maxLength={300} placeholder="請輸入地址" /></label>
                  <label className={styles.identityField}><span>統一編號／身分證字號／識別代碼 *</span><input name="businessOrIdentityNumber" required maxLength={120} placeholder="請輸入統一編號或身分證字號" /></label>
                </div>
                <DetailFields section="applicant" value={details} onChange={updateDetails} />
                <RepeatedFields group="coApplicants" title="共同申請人" value={details} onChange={updateDetails} />
                <RepeatedFields group="agents" title="代理人" value={details} onChange={updateDetails} renderAttachments={renderAttachments("agents")} />
              </section>

              <section className={styles.formSection} data-section="documents" hidden={step !== 3}><h3><ShieldCheck aria-hidden />D. 文件確認 <small>可先提交基礎資料，正式送件前我們會再協助補齊。</small></h3>
                <DetailFields section="documents" value={details} onChange={updateDetails} />
                <div className={styles.documentGrid}>{documentUploads.map(([field, title]) => <FileUploadCard field={field} title={title} files={filesFor(field)} onChange={(files) => updateFiles(field, files)} key={field} />)}</div>
                <div className={styles.reviewSummary}><h4>送出前核對</h4><p>請確認以下資料。上方步驟可隨時返回修改，已填內容會保留。</p><dl>{summary.map(([label, value], index) => <div key={index}><dt>{label}</dt><dd>{value}</dd></div>)}<div><dt>使用範圍</dt><dd>{usageOptions.filter(([v]) => usageScopes.includes(v)).map(([, label]) => label).join("、")}</dd></div>{Object.values(detailFields).flat().filter((field) => details.fields[field.key]).map((field) => <div key={field.key}><dt>{field.label}</dt><dd>{details.fields[field.key]}</dd></div>)}{Object.entries(repeatFields).map(([group, fields]) => details[group as keyof Omit<typeof details, "fields">].map((row, index) => <div key={`${group}-${index}`}><dt>{({priorities:"優先權",exhibitions:"展覽會",goods:"商品／服務",coApplicants:"共同申請人",agents:"代理人"} as Record<string,string>)[group]} {index + 1}</dt><dd>{fields.filter((f) => row[f.key as keyof typeof row]).map((f) => `${f.label}：${row[f.key as keyof typeof row]}`).join("；")}</dd></div>))}<div><dt>已附文件（{uploads.length}）</dt><dd>{uploads.map(({file, category}) => `${isLinkedAttachment(category) ? attachmentLabel(category, details) : documentUploads.find(([field]) => field === category)?.[1] ?? "商標圖樣"}：${file.name}`).join("\n") || "尚未上傳"}</dd></div></dl></div>
                <div className={styles.confirmations}><label><input type="checkbox" checked={confirmationAccepted} onChange={(event) => setConfirmationAccepted(event.target.checked)} />我確認目前提供之資料為真實資訊</label><label><input type="checkbox" checked={preReviewAccepted} onChange={(event) => setPreReviewAccepted(event.target.checked)} />我瞭解本表為商標申請前資料預審，不代表已正式送件</label></div>
              </section>
            </main>
            <aside className={styles.modalHelp}><h3>送出後我們會協助</h3>{helpCards.map(({ icon: Icon, title, text }) => <article key={title}><Icon aria-hidden /><h4>{title}</h4><p>{text}</p></article>)}<div className={styles.helpDisclaimer}><ShieldCheck aria-hidden /><p>本服務為專業諮詢與申請資料整理協助，不代表政府核准，亦不保證商標申請成功。</p></div></aside>
          </div>
          {error ? <p className={styles.formError} role="alert">{error}</p> : null}
          <div className={styles.formActions}><button className={styles.backButton} type="button" disabled={step === 0 || submitting} onClick={() => goToStep(step - 1)}><ArrowLeft aria-hidden />上一步</button><button className={styles.submitButton} type="submit" disabled={submitting}>{submitting ? <><LoaderCircle className={styles.spin} aria-hidden />送出中…</> : step < 3 ? <>下一步：{formSteps[step + 1]} <ArrowRight aria-hidden /></> : <>提交商標申請預審 <ArrowRight aria-hidden /></>}</button></div>
          <p className={styles.secureNote}><ShieldCheck aria-hidden />送出後將由專業人員進行資料初審，後續會透過您留下的聯絡方式與您聯繫。</p>
        </form>
      </>}
    </section>
  </div>;
}

export function ProfessionalRightsPage({ governmentFeeNotice, serviceFeeNotice, managedPage }: { governmentFeeNotice: string; serviceFeeNotice: string; managedPage?: CmsPage | null }) {
  const heroBlock = managedPage?.blocks.find(block=>block.zone==="hero");
  const hero = {...defaultProtectionBlocks()[0].props,...heroBlock?.props};
  const [showTrademarkInfo, setShowTrademarkInfo] = useState(false);
  const [consultationOpen, setConsultationOpen] = useState(false);

  return <div className={styles.page} data-page="professional-rights-taiwan" id="top">
    <section className={styles.hero} data-nav-hero data-nav-hero-centered="flow" aria-labelledby="professional-rights-title" data-cms-zone="hero" style={managedBlockStyle(heroBlock)}>
      <div className={styles.heroCopy} data-nav-hero-copy>
        <p data-cms-field="eyebrow" style={managedFieldStyle(heroBlock,"eyebrow")}>{String(hero.eyebrow)}</p>
        <h1 id="professional-rights-title" data-cms-field="title" style={managedFieldStyle(heroBlock,"title")}>{String(hero.title)}</h1>
        <h2 data-cms-field="subtitle" style={managedFieldStyle(heroBlock,"subtitle")}>{String(hero.subtitle)}</h2>
        <p className={styles.heroLead} data-cms-field="description" style={{...managedFieldStyle(heroBlock,"description"),whiteSpace:"pre-line"}}>{String(hero.description)}</p>
        <div className={styles.heroActions}>
          <button className={styles.heroCta} type="button" onClick={() => setConsultationOpen(true)}>預約專業權益諮詢 <ArrowRight aria-hidden /></button>
          <a href="#services-title">查看服務內容</a>
        </div>
        <div className={styles.legalNotice}><ShieldCheck aria-hidden /><p>本服務提供權益資料整理、台灣商標申請協助與專業支援，<br />不代表政府認證，亦不保證任何商標申請或法律案件結果。</p></div>
      </div>
      <div className={styles.heroVisual}><Image src={`${assetRoot}/hero-character-hologram@2x.png`} alt="AI Creator 與專業權益支援示意" width={1064} height={576} priority unoptimized /></div>
    </section>

    <section className={styles.servicesSection} aria-labelledby="services-title">
      <header><p>TAIWAN PROFESSIONAL RIGHTS SERVICES</p><h2 id="services-title">AI IP 權益保護服務</h2><span>以商標、創作證據、授權文件與專業支援為核心，依個案需求規劃。</span></header>
      <div className={styles.serviceGrid}>{services.map((service, index) => <article className={service.expandable ? styles.featuredService : undefined} key={service.title}>
        <span className={styles.serviceNumber}>{String(index + 1).padStart(2, "0")}</span>
        <Image src={service.image} alt="" width={300} height={252} unoptimized />
        <h3>{service.title}</h3><p>{service.text}</p>
        {service.expandable ? <button type="button" aria-expanded={showTrademarkInfo} onClick={() => setShowTrademarkInfo((value) => !value)}>{showTrademarkInfo ? "收起準備資料" : "查看準備資料"} <ArrowRight aria-hidden /></button> : null}
      </article>)}</div>
      {showTrademarkInfo ? <div className={styles.trademarkInfo}>
        <header><FileSearch aria-hidden /><div><p>TAIWAN TRADEMARK APPLICATION</p><h3>台灣商標申請常見準備資料</h3></div></header>
        <ol>{trademarkMaterials.map(([title, text], index) => <li key={title}><span>{index + 1}</span><p><strong>{title}</strong>{text}</p></li>)}</ol>
        <div><Info aria-hidden /><p>{governmentFeeNotice}<br />{serviceFeeNotice}</p></div>
      </div> : null}
    </section>

    <section className={styles.processBenefits} aria-label="台灣商標申請流程與付費方案內容">
      <div className={styles.processPanel}>
        <header><p>TAIWAN TRADEMARK PROCESS</p><h2>申請／服務流程</h2></header>
        <ol className={styles.processGrid}>{processSteps.map(({ icon: Icon, title, text }, index) => <li key={title}>
          <span className={styles.stepNumber}>{index + 1}</span><Icon aria-hidden /><h3>{title}</h3><p>{text}</p>
          {index < processSteps.length - 1 ? <ArrowRight className={styles.processArrow} aria-hidden /> : null}
        </li>)}</ol>
        <div className={styles.processNotice}><ShieldCheck aria-hidden /><p>協助降低資料準備錯誤、完成申請前檢索與案件流程追蹤；實際審查及核准結果仍由主管機關依個案決定。</p></div>
      </div>
      <aside className={styles.benefitsPanel}>
        <p>PROFESSIONAL SUPPORT</p><h2>付費方案可提供</h2>
        <ul>{benefits.map((benefit) => <li key={benefit}><Check aria-hidden />{benefit}</li>)}</ul>
        <button type="button" onClick={() => setConsultationOpen(true)}>預約專業權益諮詢 <ArrowRight aria-hidden /></button>
        <small>先進行需求評估，不會直接付款。</small>
      </aside>
    </section>

    <section className={styles.planDifference} aria-label="免費認證與付費服務差異">
      <article><span>免費</span><div><h2>AI Creator ID 平台認證</h2><p>建立 AI 人物平台身分、平台內保護與平台申訴機制。</p></div><a href="#services-title">瞭解服務內容 <ArrowRight aria-hidden /></a></article>
      <article><span>付費</span><div><h2>專業權益保護服務</h2><p>商標、創作證據、授權文件與平台外專業權益支援。</p></div><button type="button" onClick={() => setConsultationOpen(true)}>預約專業權益諮詢 <ArrowRight aria-hidden /></button></article>
    </section>

    <section className={styles.bottomNotice}><Info aria-hidden /><div><h2>重要說明</h2><p>本服務不涉及政府認證或具有法律效力之證書，也不保證商標核准、法律案件結果或訴訟結果。新型專利、設計專利或其他保護方式，僅在成果符合相關條件時另由專業人員評估。</p></div></section>
    {consultationOpen ? <ConsultationModal onClose={() => setConsultationOpen(false)} /> : null}
  </div>;
}
