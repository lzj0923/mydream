"use client";

import { useEffect, useState } from "react";
import { Search, Wallet, WalletCards, BadgeCheck } from "lucide-react";
import "./account-earnings.css";
import { BankAccountDialog } from "./bank-account-dialog";
import {WithdrawalDialog} from "./withdrawal-dialog";
import type {EarningsSummary} from "@/lib/creator-settlement/summary";

export function AccountEarnings({ balance, view, onView, search, onSearch, revision, onRefresh }: {
  revision:number; onRefresh:()=>void; balance: string | null; view: "contracts" | "points"; onView: (value: "contracts" | "points") => void;
  search: string; onSearch: (value: string) => void;
}) {
  const [bankOpen, setBankOpen] = useState(false);
  const [withdrawOpen,setWithdrawOpen]=useState(false);
  const [result,setResult]=useState<{revision:number;data?:EarningsSummary;error?:string}|null>(null);
  const summary=result?.revision===revision?result.data:null,error=result?.revision===revision?result.error:"";
  useEffect(()=>{const controller=new AbortController();fetch("/api/creator-settlement/summary",{cache:"no-store",signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message||"收益讀取失敗");return d;}).then(d=>{if(!controller.signal.aborted)setResult({revision,data:d});}).catch(e=>{if(!controller.signal.aborted)setResult({revision,error:e.message});});return()=>controller.abort();},[revision]);
  const months=summary?.months??[];
  const max=Math.max(1,...months.map(m=>Number(m.amount)));
  return <>
    <div className="ce-heading"><h1 className="cw-page-title">作品收益</h1><span>App 已入賬分潤與提現記錄</span></div>
    <div className="ce-overview">
      <div><div className="ce-total"><strong>{summary?.income??"—"}</strong><span>{summary?.incomeComplete?"累計分潤 · 積分":"已讀取分潤 · 積分"}</span></div>
        <div className="ce-stats">{[[Wallet, "可用積分",balance], [WalletCards, "待處理提現（元）",summary?.pending], [BadgeCheck, "已打款（元）",summary?.paid]].map(([Icon, label,value]) => { const Symbol = Icon as typeof Wallet; return <div key={String(label)}><i><Symbol size={21}/></i><div><span>{String(label)}</span><strong>{typeof value==="string"?value:"—"}</strong></div></div>; })}</div>
        <p className="ce-balance">分潤為已入賬積分，提現金額由 App 換算；統計對應當前綁定的 App 賬號。{summary&&!summary.withdrawalsComplete&&"提現統計僅涵蓋已讀取記錄。"}{summary&&!summary.incomeComplete&&"分潤統計尚不完整。"}</p>
      </div>
      <div className="ce-trend"><div><span>分潤趨勢 / 積分</span><span>最近六個入賬月份</span></div>{months.length?<div className="ce-income-bars">{months.map(m=><div key={m.month}><span>{m.amount}</span><i style={{height:`${Math.max(2,Number(m.amount)/max*72)}px`}}/><small>{m.month}</small></div>)}</div>:<p>{error||summary?.income===null?"分潤暫時無法讀取":summary?"暫無分潤入賬":"正在讀取…"}</p>}</div>
    </div>
    {error&&<p role="alert">{error}</p>}

    <div className="ce-toolbar"><div className="ce-tabs"><button className={view === "contracts" ? "is-active" : ""} onClick={() => onView("contracts")}>合同賬單</button><button className={view === "points" ? "is-active" : ""} onClick={() => onView("points")}>積分流水</button></div><div className="ce-tools"><label className="ce-search"><span>{view === "contracts" ? "合同名稱" : "流水說明"}</span><input aria-label={view === "contracts" ? "搜索合同名稱" : "搜索本頁流水"} placeholder={view === "contracts" ? "請輸入合同名稱" : "搜索本頁流水"} value={search} onChange={event => onSearch(event.target.value)}/><Search size={16}/></label><button className="ce-bank" onClick={() => setBankOpen(true)}>銀行卡信息</button><button className="ce-bank" disabled={balance===null||Number(balance)<1} onClick={()=>setWithdrawOpen(true)}>申請提現</button></div></div>
    {view === "contracts" && <><div className="cw-settlement-table-wrap"><table className="cw-settlement-table"><thead><tr>{["合同名稱", "合同編號", "合同屬性", "分賬類型", "截至當前累積收入", "操作"].map(title => <th key={title}>{title}</th>)}</tr></thead><tbody><tr><td colSpan={6} className="ce-empty">{search ? "暫無匹配的合同賬單" : "暫無合同分賬賬單"}<small>合同分賬數據尚未接入，可切換「積分流水」查看 App 記錄。</small></td></tr></tbody></table></div></>}
    <details className="ce-project-income"><summary>項目收益明細</summary><p className="admin-muted">僅將有作品編號和結算依據的 App 分潤對應項目，賬號總收益不會平均分配。</p>{summary?.projects?<>{summary.projects.items.length?<table className="cw-settlement-table"><thead><tr><th>項目</th><th>已歸屬分潤（積分）</th><th>入賬筆數</th></tr></thead><tbody>{summary.projects.items.map(item=><tr key={item.projectId}><td>{item.title}</td><td>{item.amount}</td><td>{item.entries}</td></tr>)}</tbody></table>:<p>目前 App 流水尚無可核實的項目收益歸屬。</p>}<p>尚未歸屬項目：{summary.projects.unattributed} 積分{!summary.projects.complete&&"（僅統計已讀取流水）"}</p></>:<p>目前按綁定 App 賬號統計收益，現有流水未提供作品歸屬，暫不支持按項目拆分。</p>}</details>
    {withdrawOpen&&<WithdrawalDialog balance={balance} onClose={()=>setWithdrawOpen(false)} onSubmitted={onRefresh}/>}
    {bankOpen && <BankAccountDialog onClose={() => setBankOpen(false)}/>}
  </>;
}

