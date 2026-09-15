"use client";
import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { X, Check, BookOpen, ChevronRight, FileText, ClipboardCheck } from "lucide-react";
import { creatorOptionLabel, statusLabels, type CreatorScript, type IpInterest } from "@/components/creator-workspace/types";
import { ProductionCenter } from "@/components/creator-workspace/production-center";
import { ContractCenter } from "@/components/creator-workspace/contract-center";
async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/creator/${path}`, { method, cache: "no-store", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.detail || "操作失敗，請稍後重試"), { status: response.status });
  return result as T;
}
const date = (value: string | null) => value ? new Date(value).toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" }) : "—";

const interestLabels = { PENDING: "待平台評估", CONTACTING: "合作洽談中", DECLINED: "暫不合作" };
function Modal({ title, children, close, wide = false }: { title: string; children: ReactNode; close: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); const body = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = body; }; }, []);
  return <dialog ref={ref} className={`cw-modal${wide ? " cw-modal-wide" : ""}`} onCancel={(e) => { e.preventDefault(); close(); }} aria-labelledby="cw-modal-title"><div className="cw-modal-head"><h2 id="cw-modal-title">{title}</h2><button className="cw-icon-button" aria-label="關閉窗口" onClick={close}><X size={20} /></button></div>{children}</dialog>;
}

function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return <div className="cw-empty"><span className="cw-empty-icon">{icon}</span><h3>{title}</h3><p>{text}</p>{action}</div>;
}

function ScriptTable({ scripts, open, showProject = true }: { scripts: CreatorScript[]; open: (script: CreatorScript) => Promise<void>; showProject?: boolean }) {
  return <div className="cw-table-scroll"><table className="cw-table"><thead><tr><th>劇本名稱</th><th>類型 / 集數</th><th>狀態</th><th>最近更新</th><th>操作</th></tr></thead><tbody>{scripts.map((script) => <tr key={script.id}><td><button className="cw-script-name" onClick={() => void open(script)}><span><FileText size={21} /></span><div><b>{script.title}</b><small>{creatorOptionLabel(script.genre)}</small></div></button></td><td>{creatorOptionLabel(script.format)}<small>{script.episodeCount} 集</small></td><td><span className={`cw-status status-${script.status.toLowerCase()}`}>{statusLabels[script.status]}</span></td><td>{date(script.updatedAt)}</td><td><button className="cw-text-button" onClick={() => void open(script)}>{script.status === "DRAFT" || script.status === "CHANGES_REQUESTED" ? "繼續編輯" : "查看詳情"}<ChevronRight size={14} /></button>{showProject && script.status === "APPROVED" && <a className="cw-text-button" href={`#projects?project=${encodeURIComponent(script.id)}`}>進入項目<ChevronRight size={14}/></a>}</td></tr>)}</tbody></table></div>;
}

function ReviewDialog({ script, close, done }: { script: CreatorScript; close: () => void; done: () => void }) {
  const [note, setNote] = useState(script.reviewNote || ""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const decide = async (decision: string) => { setBusy(true); setError(""); try { await api(`reviews/${script.id}`, "POST", { decision, note, version: script.version }); done(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };
  return <Modal title={`投稿評審 · ${script.title}`} close={busy ? () => {} : close} wide><div className="cw-editor"><div className="cw-info-strip">{creatorOptionLabel(script.format)} · {creatorOptionLabel(script.genre)} · {script.episodeCount} 集 · {statusLabels[script.status]}</div><h3>故事梗概</h3><p className="cw-review-text">{script.synopsis}</p><h3>劇本正文</h3><pre className="cw-review-text">{script.body}</pre>{error && <div role="alert" className="cw-error">{error}</div>}<label>編輯反饋<textarea maxLength={1000} rows={4} value={note} disabled={script.status !== "SUBMITTED" || busy} onChange={(e) => setNote(e.target.value)} placeholder="給創作者的審核意見或修改建議" /></label>{script.status === "SUBMITTED" && <div className="cw-editor-actions"><span>通過不代表簽約或自動發佈</span><div><button className="cw-outline" disabled={busy || !note.trim()} onClick={() => void decide("CHANGES_REQUESTED")}>退回修改</button><button className="cw-primary" disabled={busy} onClick={() => void decide("APPROVED")}>審核通過 <Check size={16} /></button></div></div>}</div></Modal>;
}

function InterestReviewPanel() {
  const [items, setItems] = useState<IpInterest[]>([]); const [selected, setSelected] = useState<IpInterest | null>(null); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const refresh = useCallback(() => { api<IpInterest[]>("interest-reviews").then(setItems).catch((e) => setError(e.message)); }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const decide = async (decision: string) => { if (!selected) return; setBusy(true); setError(""); try { await api(`interest-reviews/${selected.id}`, "POST", { decision, note, version: 0 }); setSelected(null); refresh(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };
  return <section className="cw-card cw-interest-review"><div className="cw-card-title"><h2>IP 合作意向</h2><button className="cw-text-button" onClick={refresh}>刷新</button></div>{error && !selected && <div role="alert" className="cw-error">{error}</div>}{items.length ? <div className="cw-table-scroll"><table className="cw-table"><thead><tr><th>作品名稱</th><th>改編形式</th><th>申請時間</th><th>狀態</th><th>操作</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.workTitle}</td><td>{item.format}</td><td>{date(item.createdAt)}</td><td>{interestLabels[item.status]}</td><td><button className="cw-text-button" onClick={() => { setSelected(item); setNote(item.reviewNote); }}>查看申請 <ChevronRight size={14} /></button></td></tr>)}</tbody></table></div> : <Empty icon={<BookOpen />} title="暫無 IP 合作意向" text="用戶提交的 IP 合作申請將展示在這裡。" />}{selected && <Modal title={`IP 合作意向 · ${selected.workTitle}`} close={() => { if (!busy) setSelected(null); }}><div className="cw-editor"><span className="cw-pill">{selected.format} · {interestLabels[selected.status]}</span><p className="cw-review-text">{selected.proposal}</p>{error && <div role="alert" className="cw-error">{error}</div>}<label>平台反饋<textarea disabled={selected.status !== "PENDING" || busy} rows={4} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="說明合作評估結果及後續安排" /></label>{selected.status === "PENDING" && <div className="cw-editor-actions"><button className="cw-outline" disabled={busy || !note.trim()} onClick={() => void decide("DECLINED")}>暫不合作</button><button className="cw-primary" disabled={busy || !note.trim()} onClick={() => void decide("CONTACTING")}>進入洽談</button></div>}</div></Modal>}</section>;
}

export function CreatorReviewPanel({ section }: { section: "reviews" | "agreements" | "deliveries" | "interests" }) {
 const [items,setItems]=useState<CreatorScript[]>([]),[selected,setSelected]=useState<CreatorScript|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 const load=useCallback(async()=>{setLoading(true);setError("");try{setItems(await api<CreatorScript[]>("reviews"));}catch(e){setError((e as Error).message);}finally{setLoading(false);}},[]);
 useEffect(()=>{if(section!=="reviews")return;let alive=true;api<CreatorScript[]>("reviews").then(v=>{if(alive){setItems(v);setError("");}}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[section]);
 return <div className="admin-creator-reviews">
 {section==="agreements" ? <ContractCenter admin/> : section==="deliveries" ? <ProductionCenter admin/> : section==="interests" ? <InterestReviewPanel/> : <section className="cw-card"><div className="cw-card-title"><h2>劇本投稿審核</h2><button className="cw-text-button" disabled={loading} onClick={()=>void load()}>刷新列表</button></div>{error?<div role="alert" className="cw-error">{error}<button onClick={()=>void load()}>重試</button></div>:loading?<p role="status">正在讀取投稿…</p>:items.length?<ScriptTable scripts={items} showProject={false} open={async s=>setSelected(s)}/>:<Empty icon={<ClipboardCheck/>} title="暫無投稿" text="創作者提交後會顯示在這裡。"/>}</section>}
 {selected&&<ReviewDialog script={selected} close={()=>setSelected(null)} done={()=>{setSelected(null);void load();}}/>}
 </div>;
}
