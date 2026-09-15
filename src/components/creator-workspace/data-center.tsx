"use client";
import { useEffect, useState } from "react";
import { BarChart3, Download, RefreshCw, Eye, Heart, MessageCircle, Users, Wallet } from "lucide-react";
import { csvCell, filterVideos, sumRewards, totalMetric, type AnalyticsData, type Metric } from "@/lib/creator-analytics";
import "./data-center.css";
import {projectIssueText} from "@/lib/creator-video/project-analytics-data";
const num = (value:number|null) => value === null ? "—" : value.toLocaleString("zh-TW");
const metrics: {key:Metric;label:string}[] = [{key:"views",label:"播放"},{key:"likes",label:"點贊"},{key:"comments",label:"評論"},{key:"collections",label:"收藏"}];
export function CreatorDataCenter({ detailsOnly = false }: { detailsOnly?: boolean }){
  const [data,setData]=useState<AnalyticsData|null>(null);
  const [error,setError]=useState("");
  const [login,setLogin]=useState(false);
  const [refresh,setRefresh]=useState(0);
  const [days,setDays]=useState(0);
  const [search,setSearch]=useState("");
  const [metric,setMetric]=useState<Metric>("views");
  const [tab,setTab]=useState<"videos"|"rewards">("videos");
  const [page,setPage]=useState(1);
  const reload=()=>{setData(null);setError("");setLogin(false);setRefresh(v=>v+1);};
  useEffect(()=>{
    const abort=new AbortController();
    fetch("/api/creator-analytics",{cache:"no-store",signal:abort.signal}).then(async response=>{
      const result=await response.json();if(abort.signal.aborted)return;if(!response.ok){setLogin((response.status===401 || response.status===409));throw new Error(result.message||"數據加載失敗");}setData(result);
    }).catch(e=>{if(!abort.signal.aborted)setError(e.message||"數據加載失敗");});
    return ()=>abort.abort();
  },[refresh]);
  if(!data)return <section className="cw-card ca-state" aria-live="polite"><BarChart3 size={32}/><h2>{error||"正在讀取你的 App 創作數據…"}</h2><p>{error?"請在賬號信息中檢查 App 綁定，或稍後重試。":"正在彙總作品流量與創作者分潤記錄"}</p>{error&&<div>{login&&<a href="#account">檢查 App 綁定</a>}<button onClick={reload}>重新加載</button></div>}</section>;
  const now=Date.parse(data.updatedAt);
  const videos=filterVideos(data.videos,days,search,now).sort((a,b)=>(b[metric]??-1)-(a[metric]??-1));
  const top=videos.filter(v=>v[metric]!==null).slice(0,8);
  const max=Math.max(1,...top.map(v=>v[metric]||0));
  const rewards=data.rewards;
  const monthly=new Map<string,typeof rewards>();
  for(const reward of rewards||[]){const date=reward.date.slice(0,7);if(/^\d{4}-\d{2}$/.test(date))monthly.set(date,[...(monthly.get(date)||[]),reward]);}
  const income=Array.from(monthly,([date,rows])=>({date,amount:sumRewards(rows||[])})).sort((a,b)=>a.date.localeCompare(b.date)).slice(-6);
  const incomeMax=Math.max(1,...income.map(r=>Number(r.amount)));
  const count=tab==="videos"?videos.length:rewards?.length||0;
  const pages=Math.max(1,Math.ceil(count/10));
  const current=Math.min(page,pages);
  const exportData=()=>{
    const rows=tab==="videos"?[["作品","發佈時間","播放","點贊","評論","收藏"],...videos.map(v=>[v.title,v.publishedAt,v.views,v.likes,v.comments,v.collections])]:[["入賬時間","創作者分潤（積分）"],...(rewards||[]).map(r=>[r.date,r.amount])];
    const url=URL.createObjectURL(new Blob(["\ufeff"+rows.map(r=>r.map(csvCell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}));
    const link=document.createElement("a");link.href=url;link.download=`我的${tab==="videos"?"作品流量":"創作者分潤"}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  return <div className={`ca-dashboard${detailsOnly ? " ca-details-only" : ""}`}>
    <div className="ca-heading"><div><span className="ca-eyebrow">CREATOR ANALYTICS</span><h1 className="cw-page-title">每一份創作，都有迴響</h1><p>當前創作身份的項目劇集數據 · 賬號分潤另列</p></div><button onClick={reload}><RefreshCw size={15}/>刷新數據</button></div>
    {(!data.complete||!data.rewardsComplete)&&<div className="ca-notice" role="status">{!data.complete&&(data.videosUnavailable?"部分作品數據讀取失敗，可刷新重試。 ":"作品較多，當前統計已讀取的前 1,000 部作品。 ")}{rewards===null?"收益流水暫時讀取失敗，可刷新重試。":!data.rewardsComplete?"當前收益僅彙總最近 1,000 條積分流水中識別到的創作者分潤，不代表全部收益。":""}</div>}
    {data.projectComplete===false&&<div className="ca-notice" role="status">{data.projectIssues?.length ? <><strong>部分劇集數據待確認，相關統計暫以「—」顯示。</strong><details><summary>查看 {data.projectIssues.length} 集的具體原因</summary>{data.projectIssues.map(issue=><p key={`${issue.dramaId}:${issue.episodeId}`}>{projectIssueText(issue)}</p>)}</details></> : "項目數據未完整讀取，請稍後刷新；若持續出現，請聯繫平台檢查項目關聯。"}</div>}
    {(data.projectCount??0)>0&&data.projectIncomeAvailable===false&&<p className="ca-footnote">統計口徑：項目劇集的播放、點贊及評論來自 App；分潤按綁定 App 賬號的已入賬流水彙總，暫無單個項目的收益明細。</p>}
    <div className="ca-kpis">{[{label:"累計播放",value:num(totalMetric(data.videos,"views")),icon:Eye,note:"現有作品播放次數"},{label:"獲得點贊",value:num(totalMetric(data.videos,"likes")),icon:Heart,note:"現有作品累計點贊"},{label:"作品評論",value:num(totalMetric(data.videos,"comments")),icon:MessageCircle,note:"現有作品累計評論"},{label:"賬號粉絲",value:num(data.fans),icon:Users,note:data.profileUnavailable?"暫時無法讀取":"賬號共用，不區分漫劇與短劇"},{label:data.rewardsComplete?"賬號已入賬分潤":"賬號已讀取分潤",value:rewards===null?"—":sumRewards(rewards),icon:Wallet,note:"賬號共用 · 尚未按作品類型歸屬"}].map(k=><section key={k.label}><div><span>{k.label}</span><k.icon size={18}/></div><strong>{k.value}</strong><small>{k.note}</small></section>)}</div>
    <div className="ca-charts"><section className="cw-card"><div className="ca-card-head"><div><h3>作品流量排行</h3><p>按下方篩選範圍 · 累計{metrics.find(m=>m.key===metric)?.label} TOP 8</p></div><select aria-label="排行指標" value={metric} onChange={e=>{setMetric(e.target.value as Metric);setPage(1);}}>{metrics.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}</select></div><div className="ca-bars">{top.length?top.map((v,i)=><div className="ca-bar-row" key={v.id}><span title={v.title}>{String(i+1).padStart(2,"0")}　{v.title}</span><div><i style={{width:`${(v[metric]||0)/max*100}%`}}/></div><b>{num(v[metric])}</b></div>):<p className="ca-empty">暫無可展示的作品流量</p>}</div></section>
    <section className="cw-card"><div className="ca-card-head"><div><h3>賬號分潤入賬趨勢</h3><p>最近 6 個有入賬的月份 · 單位：積分</p></div><Wallet size={18}/></div><div className="ca-columns">{income.length?income.map(r=><div key={r.date} title={`${r.date}：${r.amount} 積分`}><b>{r.amount}</b><i style={{height:`${Number(r.amount)/incomeMax*135}px`}}/><span>{r.date}</span></div>):<p className="ca-empty">{rewards===null?"收益數據暫時不可用":"App 暫無分潤入賬記錄，入賬後刷新即可查看"}</p>}</div><p className="ca-footnote">按 App 積分流水已入賬的創作者分潤獎勵彙總，不含邀請獎勵；未入賬的預計收益不計入。</p></section></div>
    <section className="cw-card ca-details"><div className="ca-card-head"><div className="ca-tabs"><button aria-pressed={tab==="videos"} onClick={()=>{setTab("videos");setPage(1);}}>作品明細</button><button aria-pressed={tab==="rewards"} onClick={()=>{setTab("rewards");setPage(1);}}>賬號分潤明細</button></div><button onClick={exportData} disabled={tab==="rewards"&&rewards===null}><Download size={15}/>導出表格</button></div>
    {tab==="videos"&&<div className="ca-filters"><input aria-label="搜索作品" placeholder="搜索作品名稱" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/><select aria-label="作品發佈時間" value={days} onChange={e=>{setDays(Number(e.target.value));setPage(1);}}><option value={0}>全部發布時間</option><option value={7}>近 7 天發佈</option><option value={30}>近 30 天發佈</option><option value={90}>近 90 天發佈</option></select><span>篩選作品發佈時間，數值為作品累計數據。</span></div>}
    <div className="ca-table-scroll"><table><thead><tr>{(tab==="videos"?["作品","發佈時間","播放","點贊","評論","收藏"]:["入賬時間","收益類型","積分"]).map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{tab==="videos"?videos.slice((current-1)*10,current*10).map(v=><tr key={v.id}><td><strong>{v.title}</strong><small>ID {v.id} · {v.status==="published"?"已上架":v.status==="normal"?"正常":v.status==="hidden"?"已隱藏":v.status||"未知狀態"}</small></td><td>{v.publishedAt?new Date(v.publishedAt).toLocaleDateString("zh-TW"):"—"}</td>{metrics.map(m=><td key={m.key}>{num(v[m.key])}</td>)}</tr>):(rewards||[]).slice((current-1)*10,current*10).map(r=><tr key={r.id}><td>{r.date||"—"}</td><td>創作者分潤獎勵</td><td className="ca-positive">+{r.amount}</td></tr>)}{!count&&<tr><td colSpan={tab==="videos"?6:3} className="ca-empty">{tab==="rewards"&&rewards===null?"讀取失敗，請刷新重試":"暫無符合條件的記錄"}</td></tr>}</tbody></table></div>
    <div className="ca-pagination"><span>共 {count} 條</span><button disabled={current<=1} onClick={()=>setPage(current-1)}>上一頁</button><span>{current} / {pages}</span><button disabled={current>=pages} onClick={()=>setPage(current+1)}>下一頁</button></div></section>
    <p className="ca-footnote">數據更新於 {new Date(data.updatedAt).toLocaleString("zh-TW")}。播放與互動為 App 當前保留作品的累計值；“—”表示接口未提供。分潤以積分記賬，具體提現記錄見<a href="#settlement">結算中心</a>。</p>
  </div>;
}
