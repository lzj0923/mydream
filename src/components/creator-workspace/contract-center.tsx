"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { FileCheck2, Download, RefreshCw, Search } from "lucide-react";
import { agreementDocument, agreementLabels, latestAgreement, type Agreement, type AgreementData, type AgreementTemplate } from "@/lib/creator-agreements";
import "./contract-center.css";
import {WorkTypeTabs} from "./work-type";
import { FilmEmpty } from "./workspace-panels";

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/creator/${path}`, { method, cache: "no-store", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "合同服務暫時不可用");
  return data;
}
function download(doc: Parameters<typeof agreementDocument>[0]) {
  const url = URL.createObjectURL(new Blob([agreementDocument(doc)], { type: "text/html;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = `MY-DREAM-${doc.id || "placeholder"}.html`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ContractGate({ required, children }: { required: boolean; children: ReactNode }) {
  const [ready, setReady] = useState(false), [checked, setChecked] = useState(false), [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!required) return;
    let alive = true;
    request<AgreementData>("contracts").then(d => { if (alive) { setReady(d.ready); setChecked(true); setError(""); } }).catch(e => { if (alive) { setChecked(true); setError(e.message); } });
    return () => { alive = false; };
  }, [required, revision]);
  if (!required || (checked && ready && !error)) return children;
  if (!checked) return <section className="cw-card agreement-center" role="status">正在核對創作者合作協議…</section>;
  if (error) return <section className="cw-card agreement-center"><p role="alert">{error}</p><button onClick={() => { setChecked(false); setRevision(n => n+1); }}>重新連接</button></section>;
  return <ContractCenter onboarding onReady={() => setReady(true)} />;
}

export function ContractCenter({ admin = false, onboarding = false, onReady }: { admin?: boolean; onboarding?: boolean; onReady?: () => void }) {
  const [data,setData] = useState<AgreementData | null>(null), [error,setError] = useState(""), [loading,setLoading] = useState(true);
  const [scope,setScope] = useState("membership"), [selected,setSelected] = useState(""), [filter,setFilter] = useState("ALL");
  const [templatesOpen,setTemplatesOpen] = useState(false);
  const [documentOpen,setDocumentOpen] = useState(false);
  const [contractSearch,setContractSearch] = useState("");
  const base = admin ? "contract-reviews" : "contracts";
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await request<AgreementData>(base)); } catch(e) { setError((e as Error).message); } finally { setLoading(false); }
  }, [base]);
  useEffect(() => {
    let alive = true;
    request<AgreementData>(base).then(d => { if (alive) { setData(d); setError(""); } }).catch(e => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [base]);
  useEffect(() => {
    if (admin || onboarding) return;
    const apply = () => { const [part,query] = location.hash.slice(1).split("?"); if (part === "contracts") setScope(new URLSearchParams(query).get("project") || "membership"); };
    apply(); window.addEventListener("hashchange",apply); return () => window.removeEventListener("hashchange",apply);
  }, [admin,onboarding]);
  const current = data ? admin ? data.contracts.find(c => c.id === selected) : latestAgreement(data.contracts,scope) : undefined;
  const template = data?.templates.find(t => t.kind === (scope === "membership" ? "MEMBERSHIP" : "PROJECT"));
  const project = data?.projects.find(p => p.id === scope);
  const canApply = !admin && (!current || current.state === "CHANGES_REQUESTED") && (scope === "membership" || (data?.ready && project && ["PENDING_CONTRACT","SIGNED","PRODUCING"].includes(project.stage)));
  if (!admin && !onboarding && !documentOpen) {
    const rows = (data?.contracts ?? []).filter(item => (filter === "ALL" || item.state === filter) && `${item.title} ${item.id} ${item.signerName} ${item.contextText}`.toLowerCase().includes(contractSearch.trim().toLowerCase()));
    return <section className="cw-card cw-full-panel rp-panel rp-contracts">
      <div className="rp-contract-heading"><WorkTypeTabs contract/><div className="rp-contract-tools"><button onClick={() => { setScope("membership"); setDocumentOpen(true); }}>合作協議</button><button aria-label="刷新合同" disabled={loading} onClick={() => void load()}><RefreshCw size={14}/></button><details><summary>文件說明</summary><p>項目文件按當前創作身份展示，入駐協議為賬號共用。現有文件為流程演示，不代表正式簽約。</p></details></div></div>
      <div className="cw-list-toolbar"><div className="cw-tabs">{[["ALL","全部"],...Object.entries(agreementLabels)].map(([key,label]) => <button key={key} className={filter === key ? "is-active" : ""} onClick={() => setFilter(key)}>{label}·{(data?.contracts ?? []).filter(item => key === "ALL" || item.state === key).length}</button>)}</div><label className="cw-search"><input aria-label="搜索合同" placeholder="請輸入合同名稱/合同編號" value={contractSearch} onChange={e => setContractSearch(e.target.value)}/><Search size={16}/></label></div>
      <div className="cw-table-scroll"><table className="cw-table"><colgroup>{[20,13,9,15,8,8,8,7,12].map((width,i)=><col key={i} style={{width:`${width}%`}}/>)}</colgroup><thead><tr>{["合同名稱","合同編號","確認時間","所屬項目","合同狀態","文件類型","確認人","關聯文件","操作"].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(item => <tr key={item.id}>
        <td><span className="rp-contract-name" title={item.title}>{item.title || (item.kind === "MEMBERSHIP" ? "創作者入駐合作協議" : "項目合作確認書")}</span></td><td className="rp-contract-id" title={item.id}>{item.id}</td><td>{item.reviewedAt ? new Date(item.reviewedAt).toLocaleDateString("sv-SE") : "—"}</td><td>{item.kind === "MEMBERSHIP" ? "賬號共用" : item.contextText.split("\n")[0] || "—"}</td><td><span className={`rp-status ${item.state==="DEMO_ACTIVE"?"is-success":""}`}>{agreementLabels[item.state]}</span></td><td>{item.kind === "MEMBERSHIP"?"入駐協議":"項目合作"}</td><td>{item.signerName||"—"}</td><td>—</td><td><button className="cw-contract-link" onClick={() => { setScope(item.kind === "MEMBERSHIP" ? "membership" : item.scope); setDocumentOpen(true); }}>查看合同</button><button className="cw-contract-link" onClick={()=>download(item)}>下載文件</button></td>
      </tr>)}</tbody></table></div>
      {loading ? <FilmEmpty title="正在讀取合同資料…"/> : error ? <FilmEmpty title={error}><button className="cw-outline" onClick={() => void load()}>重新加載</button></FilmEmpty> : !rows.length ? <FilmEmpty title={contractSearch?"未搜索到合同":"暫無合同數據"}/> : null}
    </section>;
  }
  return <section className="cw-card agreement-center">
    {!admin && !onboarding && <button className="cw-text-button" onClick={() => setDocumentOpen(false)}>返回合同列表</button>}
    <div className="agreement-heading"><div><span className="agreement-eyebrow">CREATOR COOPERATION</span><h2>{admin ? "合作協議審核" : onboarding ? "申請成為創作者" : "我的合作協議"}</h2><p>{admin ? "核對創作者資料及文件，確認或退回本次申請。" : "先完成平台分成合作協議，再創作投稿；項目通過後確認製作與交付安排。"}</p></div><button disabled={loading} onClick={() => void load()}><RefreshCw size={15}/>刷新狀態</button></div>
    <div className="agreement-demo"><FileCheck2 size={20}/><p><strong>目前使用佔位文件，僅供流程演示。</strong><br/>確認記錄不代表正式簽約。分成比例、授權及結算條款待正式文件確認，正式文件須另行簽署。</p></div>
    <ol className="agreement-flow">{["閱讀合作協議","提交姓名與確認","平台核對","創作與項目確認","逐集製作交付"].map((step,i) => <li key={step}><span>{i+1}</span>{step}</li>)}</ol>
    {error && <p className="agreement-error" role="alert">{error}<button onClick={() => void load()}>重試</button>{admin && <a href="/admin/site" target="_blank" rel="noreferrer">登錄官網管理後台</a>}</p>}
    {loading && <p role="status">正在讀取合同資料…</p>}
    {data && <>
      {onboarding && data.ready && <div className="agreement-success"><p>入駐協議已完成演示確認，可以開始創作。</p><button className="cw-primary" onClick={onReady}>進入創作者工作台</button></div>}
      {admin ? <><div className="agreement-toolbar"><label>審核狀態<select value={filter} onChange={e => setFilter(e.target.value)}><option value="ALL">全部</option>{Object.entries(agreementLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><button onClick={() => setTemplatesOpen(!templatesOpen)}>{templatesOpen ? "收起模板" : "管理佔位文件"}</button></div>{templatesOpen && <div className="agreement-templates">{data.templates.map(t => <TemplateEditor key={`${t.kind}-${t.version}`} template={t} saved={load}/>)}</div>}<div className="agreement-records">{data.contracts.filter(c => filter === "ALL" || c.state === filter).map(c => <button key={c.id} className={selected === c.id ? "is-selected" : ""} onClick={() => setSelected(c.id)}><strong>{c.signerName} · {c.kind === "MEMBERSHIP" ? "創作者入駐" : c.contextText.split("\n")[0]}</strong><span>{agreementLabels[c.state]} · 第 {c.attempt} 次提交</span><small>{c.ownerKey} · {new Date(c.createdAt).toLocaleString("zh-TW")}</small></button>)}{!data.contracts.filter(c => filter === "ALL" || c.state === filter).length && <p>目前沒有此狀態的合作申請。</p>}</div></> : <div className="agreement-toolbar"><label>合作文件<select value={scope} disabled={loading} onChange={e => setScope(e.target.value)}><option value="membership">入駐 · 平台分成合作協議</option>{data.projects.map(p => <option key={p.id} value={p.id}>項目 · {p.title}</option>)}</select></label>{!data.projects.length && <p>劇本審核通過後，項目合作確認書會出現在這裡。</p>}{scope !== "membership" && !data.ready && <p>請先完成入駐協議的平台確認。</p>}</div>}
      {!admin && template && canApply && <AgreementForm key={`${scope}-${template.version}-${current?.attempt || 0}`} scope={scope} template={template} previous={current} contextText={project ? `項目：${project.title}\n計劃集數：${project.episodeCount}` : "創作者入駐申請"} saved={load}/>}
      {current && <AgreementRecord key={current.id} agreement={current} admin={admin} saved={load}/>}
      {!admin && scope !== "membership" && !project && <p role="alert">找不到已通過審核的項目，請重新選擇或刷新列表。</p>}
      {!admin && current?.state === "DEMO_ACTIVE" && scope !== "membership" && project && ["PRODUCING","SIGNED","PENDING_CONTRACT"].includes(project.stage) && <a className="cw-primary" href={`#videos?project=${encodeURIComponent(scope)}&episode=1`}>前往項目上傳</a>}
      {!admin && data.contracts.filter(c => c.scope === scope && c.id !== current?.id).length > 0 && <details className="agreement-history"><summary>查看歷次提交文件與退回記錄</summary>{data.contracts.filter(c => c.scope === scope && c.id !== current?.id).map(c => <AgreementRecord key={c.id} agreement={c} admin={false} saved={load}/>)}</details>}
    </>}
  </section>;
}

function AgreementForm({scope,template,previous,contextText,saved}:{scope:string;template:AgreementTemplate;previous?:Agreement;contextText:string;saved:()=>Promise<void>}) {
  const [name,setName]=useState(previous?.signerName || ""),[contact,setContact]=useState(previous?.contact || ""),[read,setRead]=useState(false),[demo,setDemo]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const doc={...template,templateVersion:template.version,contextText};
  async function submit(e: React.FormEvent) { e.preventDefault();setError("");setBusy(true);try { await request("contracts","POST",{scope,templateVersion:template.version,previousAttempt:previous?.attempt || 0,signerName:name,contact,agreed:read,placeholderAcknowledged:demo});await saved(); }catch(e){setError((e as Error).message);}finally{setBusy(false);} }
  return <form className="agreement-form" onSubmit={submit}>
    {previous?.state === "CHANGES_REQUESTED" && <p className="agreement-error">平台退回意見：{previous.reviewNote}</p>}
    <div className="agreement-heading"><h3>{template.title} · v{template.version}</h3><button type="button" onClick={() => download(doc)}><Download size={15}/>下載佔位文件</button></div>
    <div className="agreement-document" role="region" aria-label="協議文件內容" tabIndex={0}><strong>演示文件 · 非正式合同</strong><p>{contextText}</p><pre>{template.body}</pre></div>
    <fieldset disabled={busy}><div className="agreement-fields"><label>確認人姓名<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label><label>聯絡郵箱或電話<input required maxLength={160} value={contact} onChange={e=>setContact(e.target.value)}/></label></div>
    <label className="agreement-checkbox"><input type="checkbox" required checked={read} onChange={e=>setRead(e.target.checked)}/>我已閱讀本次文件，確認所填資料正確，並提交平台核對。</label>
    <label className="agreement-checkbox"><input type="checkbox" required checked={demo} onChange={e=>setDemo(e.target.checked)}/>我知道這是佔位文件，本次操作僅為流程演示，不代表正式簽約。</label>
    {error && <p role="alert" className="agreement-error">{error}</p>}<button className="cw-primary" disabled={busy || !read || !demo || !name.trim() || !contact.trim()} type="submit">{busy ? "正在提交…" : previous ? "重新提交演示確認" : "提交演示確認"}</button></fieldset>
  </form>;
}
function AgreementRecord({agreement:c,admin,saved}:{agreement:Agreement;admin:boolean;saved:()=>Promise<void>}) {
  const [note,setNote]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function review(decision:string){setBusy(true);setError("");try{await request(`contract-reviews/${c.id}`,"POST",{decision,note});await saved();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <article className="agreement-record"><div className="agreement-heading"><div><h3>{c.title}</h3><span className={`agreement-state agreement-${c.state}`}>{agreementLabels[c.state]}</span></div><button onClick={()=>download(c)}><Download size={15}/>下載本次文件與記錄</button></div><dl><dt>確認人</dt><dd>{c.signerName} · {c.contact}</dd><dt>提交記錄</dt><dd>第 {c.attempt} 次 · {new Date(c.createdAt).toLocaleString("zh-TW")}</dd><dt>文件版本</dt><dd>v{c.templateVersion} · {c.id}</dd>{c.reviewedAt && <><dt>平台處理時間</dt><dd>{new Date(c.reviewedAt).toLocaleString("zh-TW")}</dd></>}{c.reviewNote && <><dt>平台意見</dt><dd>{c.reviewNote}</dd></>}</dl>
    <details open={admin}><summary>查看本次提交的文件快照</summary><div className="agreement-document"><strong>演示文件 · 非正式合同</strong><p>{c.contextText}</p><pre>{c.body}</pre><small>SHA-256：{c.documentHash}</small></div></details>
    {c.state === "PENDING" && !admin && <p>已提交，等待平台核對；無需重複簽署。可點擊「刷新狀態」查看結果。</p>}
    {admin && c.state === "PENDING" && <div className="agreement-review"><label>平台確認 / 退回說明<textarea maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} disabled={busy}/></label>{error && <p role="alert" className="agreement-error">{error}</p>}<div className="agreement-toolbar"><button disabled={busy || !note.trim()} onClick={()=>void review("CHANGES_REQUESTED")}>退回修改</button><button className="cw-primary" disabled={busy || !note.trim()} onClick={()=>void review("APPROVED")}>{busy ? "正在處理…" : c.kind === "MEMBERSHIP" ? "確認入駐（演示）" : "確認合作並開放上傳（演示）"}</button></div></div>}
  </article>;
}
function TemplateEditor({template:t,saved}:{template:AgreementTemplate;saved:()=>Promise<void>}) {
  const [title,setTitle]=useState(t.title),[body,setBody]=useState(t.body),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");try{await request(`contract-templates/${t.kind}`,"PUT",{title,body,version:t.version});await saved();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <form className="agreement-template" onSubmit={save}><h3>{t.kind === "MEMBERSHIP" ? "入駐分成協議" : "項目合作確認書"} · v{t.version}</h3><p>修改後產生新模板版本，已提交文件保持原樣。當前始終為演示文件。</p><fieldset disabled={busy}><label>文件標題<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>佔位文件正文<textarea required maxLength={20000} rows={12} value={body} onChange={e=>setBody(e.target.value)}/></label>{error&&<p role="alert" className="agreement-error">{error}</p>}<button type="submit" disabled={busy || !body.trim() || !title.trim()}>保存新版本</button></fieldset></form>;
}
