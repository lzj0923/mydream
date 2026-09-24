"use client";

import {
  ArrowUpRight,
  BadgeCheck,
  Globe2,
  Handshake,
  Lightbulb,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useState, type CSSProperties, type FormEvent } from "react";

const cooperationNeeds = ["IP授權", "品牌合作", "海外發行", "內容合作", "AI技術合作", "其他"];
const discoverySources = ["Google搜尋", "社群媒體", "朋友推薦", "媒體報導", "展覽活動", "其他"];

type ContactFormState = {
  company: string;
  name: string;
  phone: string;
  email: string;
  website: string;
  cooperationNeeds: string[];
  discoverySource: string;
  message: string;
  consent: boolean;
};

const emptyContactForm = (): ContactFormState => ({ company: "", name: "", phone: "", email: "", website: "", cooperationNeeds: [], discoverySource: "", message: "", consent: false });

const collaborationTracks = [
  { icon: BadgeCheck, english: "IP LICENSING", title: "IP授權", description: "角色、世界觀與跨媒體內容授權。" },
  { icon: Handshake, english: "BRAND PARTNERSHIP", title: "品牌合作", description: "共同建立具有辨識度的品牌故事。" },
  { icon: Globe2, english: "GLOBAL MARKET", title: "海外市場", description: "跨語言發行、在地化與市場連結。" },
  { icon: Users, english: "CREATOR NETWORK", title: "創作者合作", description: "串接創作者與 AI 原創內容生態。" },
] as const;

export function JygBusinessCollaboration({
  embedded = false,
  referenceDesign = false,
  heading = "商業合作／聯絡我們",
  eyebrow = "BUSINESS COLLABORATION · 04",
  description = "串聯原創 IP、品牌與全球市場，\n一起創造下一個娛樂新世界。",
  cmsZone,
  style,
}: {
  embedded?: boolean;
  referenceDesign?: boolean;
  heading?: string;
  eyebrow?: string;
  description?: string;
  cmsZone?: string;
  style?: CSSProperties;
}) {
  const [form, setForm] = useState<ContactFormState>(emptyContactForm);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ tone: "ok" | "error"; message: string } | null>(null);
  const patch = <K extends keyof ContactFormState>(field: K, value: ContactFormState[K]) => setForm((current) => ({ ...current, [field]: value }));
  const toggleNeed = (need: string) => patch("cooperationNeeds", form.cooperationNeeds.includes(need) ? form.cooperationNeeds.filter((item) => item !== need) : [...form.cooperationNeeds, need]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult(null);
    if (!form.company.trim() || !form.name.trim() || !form.phone.trim() || !form.email.trim() || !form.cooperationNeeds.length || !form.discoverySource || !form.consent) {
      setResult({ tone: "error", message: "請完整填寫所有必填項目，並同意隱私條款。" });
      return;
    }
    setSending(true);
    try {
      const response = await fetch("/public-api/v1/sites/mydream/forms/business-contact/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          payload: {
            company: form.company.trim(), name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(),
            website: form.website.trim(), cooperationNeeds: form.cooperationNeeds, discoverySource: form.discoverySource,
            message: form.message.trim(),
          },
          sourcePath: window.location.pathname,
          consent: form.consent,
        }),
      });
      if (!response.ok) {
        const problem = await response.json().catch(() => ({})) as { detail?: string; title?: string };
        throw new Error(problem.detail || problem.title || `送出失敗（${response.status}）`);
      }
      setForm(emptyContactForm());
      setResult({ tone: "ok", message: "資料已成功送出，我們會盡快與您聯繫。" });
    } catch (error) {
      setResult({ tone: "error", message: error instanceof Error ? error.message : "暫時無法送出，請稍後重試。" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`jyg-prototype jyg-business-collab-page${embedded ? " is-embedded" : ""}${referenceDesign ? " jyg-business-reference" : ""}`} data-cms-zone={cmsZone} style={style}>
      <span className="jyg-business-collab-page__grid" aria-hidden />
      <span className="jyg-business-collab-page__glow" aria-hidden />

      <main className="jyg-shell jyg-business-collab-main">
        <header className="jyg-business-collab-heading">
          <div>
            <span data-cms-field="eyebrow">{eyebrow}</span>
            <h1 data-cms-field="title">{heading}</h1>
          </div>
          <p data-cms-field="description">{description}</p>
        </header>

        <div className="jyg-business-collab-layout">
          <form className="jyg-business-collab-form" onSubmit={submit}>
            <header className="jyg-business-collab-form__intro">
              {referenceDesign && <span><Sparkles aria-hidden /> LET&apos;S CREATE TOGETHER</span>}
              <h2>想強化您的品牌實力，<br />甚至拓展新的市場行銷嗎？</h2>
              <p>讓我們一起聊聊您的想法，請填寫以下表單，我們將儘速與您聯繫。</p>
            </header>

            <div className="jyg-business-collab-fields">
              <label><span>公司名稱 <em>*</em></span><input name="company" type="text" autoComplete="organization" maxLength={160} required value={form.company} onChange={(event) => patch("company", event.target.value)} placeholder="請輸入公司名稱" /></label>
              <label><span>姓名 <em>*</em></span><input name="name" type="text" autoComplete="name" maxLength={120} required value={form.name} onChange={(event) => patch("name", event.target.value)} placeholder="請輸入姓名" /></label>
              <label><span>聯絡電話 <em>*</em></span><input name="phone" type="tel" autoComplete="tel" maxLength={50} required value={form.phone} onChange={(event) => patch("phone", event.target.value)} placeholder="請輸入聯絡電話" /></label>
              <label><span>Email <em>*</em></span><input name="email" type="email" autoComplete="email" maxLength={254} required value={form.email} onChange={(event) => patch("email", event.target.value)} placeholder="請輸入 Email" /></label>
              <label className="jyg-business-collab-wide"><span>公司網站</span><input name="website" type="url" autoComplete="url" maxLength={500} value={form.website} onChange={(event) => patch("website", event.target.value)} placeholder="請輸入公司網站" /></label>
            </div>

            <fieldset className="jyg-business-collab-options">
              <legend>合作需求 <em>*</em></legend>
              <div>{cooperationNeeds.map((item) => <label key={item}><input type="checkbox" checked={form.cooperationNeeds.includes(item)} onChange={() => toggleNeed(item)} /> <span>{item}</span></label>)}</div>
            </fieldset>

            <fieldset className="jyg-business-collab-options jyg-business-collab-options--radio">
              <legend>如何得知我們 <em>*</em></legend>
              <div>{discoverySources.map((item) => <label key={item}><input type="radio" name="discovery-source" value={item} checked={form.discoverySource === item} onChange={(event) => patch("discoverySource", event.target.value)} /> <span>{item}</span></label>)}</div>
            </fieldset>

            <label className="jyg-business-collab-message">
              <span>補充說明</span>
              <textarea name="message" maxLength={4000} value={form.message} onChange={(event) => patch("message", event.target.value)} placeholder="請告訴我們您的合作想法或需求" />
            </label>

            <label className="jyg-business-collab-agreement">
              <input type="checkbox" checked={form.consent} onChange={(event) => patch("consent", event.target.checked)} />
              <span>我已閱讀並同意隱私條款，並同意我們為本次合作洽詢使用上述資料。</span>
            </label>

            <footer className="jyg-business-collab-submit">
              <button type="submit" disabled={sending}>{sending ? "送出中…" : "送出"} <Send aria-hidden /></button>
              {result ? <small className={`jyg-business-collab-submit__status is-${result.tone}`} role="status" aria-live="polite">{result.message}</small> : null}
            </footer>
          </form>

          <aside className="jyg-business-collab-card">
            {referenceDesign && <>
              <span className="jyg-business-collab-card__orbit" aria-hidden><i /><i /></span>
              <span className="jyg-business-collab-card__eyebrow">CREATE THE NEXT IMPACT</span>
            </>}
            <h2>共創品牌力<br /><strong>一起拓展未來</strong></h2>
            <p>從世界觀、原創角色到跨市場合作，讓每一次合作都成為品牌成長的新入口。</p>

            <div className="jyg-business-collab-tracks">
              {collaborationTracks.map(({ icon: Icon, english, title, description }) => (
                <article key={title}>
                  <Icon aria-hidden />
                  <div>{referenceDesign && <small>{english}</small>}<h3>{title}</h3><p>{description}</p></div>
                  <ArrowUpRight aria-hidden />
                </article>
              ))}
            </div>

            <div className="jyg-business-collab-trust"><ShieldCheck aria-hidden /><span>合作內容將由團隊評估後與您聯繫。</span></div>
            <Lightbulb className="jyg-business-collab-card__mark" aria-hidden />
          </aside>
        </div>
      </main>
    </div>
  );
}
