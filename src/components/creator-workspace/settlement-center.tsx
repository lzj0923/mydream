"use client";

import {videoAccessNotice} from "@/lib/creator-video/access-state";
import { RefreshCw, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import type { SettlementData, SettlementTab } from "@/lib/creator-settlement/domain";
import { AccountEarnings } from "./account-earnings";
import { FilmEmpty } from "./workspace-panels";

function recordDate(value: string) {
  if (/^\d{10,13}$/.test(value)) {
    const date = new Date(Number(value) * (value.length === 10 ? 1000 : 1));
    return new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Shanghai", dateStyle: "short", timeStyle: "short" }).format(date);
  }
  return value ? value.slice(0, 19).replace("T", " ") : "—";
}

export function SettlementCenter({ initialTab = "points" }: { initialTab?: SettlementTab }) {
  const tab = initialTab;
  const [view, setView] = useState<"contracts" | "points">("points");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1), [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: SettlementData; error?: string; accessCode?: string } | null>(null);
  const key = `${tab}:${page}:${revision}`;
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/creator-settlement?tab=${tab}&page=${page}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) {
          if (!controller.signal.aborted) setResult({ key, error: data.message || "結算記錄暫時無法讀取", accessCode: data.code || (response.status===401?"UNAUTHENTICATED":"") });
        } else if (!controller.signal.aborted) setResult({ key, data });
      } catch {
        if (!controller.signal.aborted) setResult({ key, error: "網絡連接失敗，請刷新重試" });
      }
    })();
    return () => controller.abort();
  }, [key, tab, page]);
  const current = result?.key === key ? result : null;
  const loading = !current, data = current?.data;
  return <section className={`cw-card cw-settlement ${tab === "points" ? "ce-account" : ""}`}>
    <div className="cw-card-title">{tab === "withdrawals" && <h1 className="cw-page-title"><Wallet size={18} />提現記錄</h1>}<button className="cw-text-button" disabled={loading} onClick={() => setRevision(value => value + 1)}><RefreshCw size={14} />{loading ? "讀取中…" : "刷新記錄"}</button></div>
    {tab === "points" && <AccountEarnings revision={revision} onRefresh={()=>setRevision(v=>v+1)} balance={data?.balance ?? null} view={view} onView={value => { setView(value); setSearch(""); }} search={search} onSearch={setSearch}/>}
    {(tab === "withdrawals" || view === "points") && <>
    <div className="cw-settlement-table-wrap"><table className="cw-settlement-table"><thead><tr><th>時間</th><th>{tab === "points" ? "說明" : "類型"}</th><th className="cw-cell-number">{tab === "points" ? "變動積分" : "申請積分"}</th>{tab === "withdrawals" && <><th className="cw-cell-number">金額（元）</th><th>方式</th></>}<th className="cw-cell-status">狀態</th></tr></thead><tbody>{(data?.items ?? []).filter(item => !search || item.description.toLowerCase().includes(search.toLowerCase())).map(item => <tr key={item.id}><td>{recordDate(item.createdAt)}</td><td>{item.description || "—"}{item.reason && <small>{item.reason}</small>}{item.paymentReference&&<small>付款憑證：{item.paymentReference}</small>}{item.processedAt&&<small>處理時間：{recordDate(item.processedAt)}</small>}</td><td className="cw-cell-number">{item.amount ?? "—"}</td>{tab === "withdrawals" && <><td className="cw-cell-number">{item.actualAmount ?? "—"}</td><td>{item.method}</td></>}<td className="cw-cell-status"><span className="cw-pill">{item.status}</span></td></tr>)}</tbody></table></div>
    {loading ? <FilmEmpty title="正在讀取 App 記錄…"/> : current?.error ? <FilmEmpty title={current.error}>{current.accessCode && videoAccessNotice(current.accessCode).href && <a className="cw-primary" href={videoAccessNotice(current.accessCode).href}>{videoAccessNotice(current.accessCode).action}</a>}</FilmEmpty> : !data?.items.length ? <FilmEmpty title={tab === "points" ? "暫無積分流水" : "暫無提現記錄"}/> : null}

    {data ? <div className="cw-video-pagination"><button type="button" className="cw-outline" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>上一頁</button><span>第 {page} 頁</span><button type="button" className="cw-outline" disabled={loading || !data.hasMore} onClick={() => setPage(value => value + 1)}>下一頁</button></div> : null}
    </>}
    {tab === "points" && view === "contracts" && current?.error && <p role="alert">{current.error}{current.accessCode && videoAccessNotice(current.accessCode).href && <a href={videoAccessNotice(current.accessCode).href}> · {videoAccessNotice(current.accessCode).action}</a>}</p>}
  </section>;
}

