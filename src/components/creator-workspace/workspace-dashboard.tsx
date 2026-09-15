"use client";

import Link from "next/link";
import {hasPermission,roleLabel} from "@/lib/creator-team/roles";
import {useCompanyPermissions} from "./company-team";
import Image from "next/image";
import { useEffect,useState } from "react";
import { ChevronRight, CircleHelp, FilePenLine, Heart, BookOpen, MessageSquare, Plus, X } from "lucide-react";
import type { Project } from "./production-center";
import { type CatalogWork, type WorkspaceData } from "./types";

type Article = { title: string; category: string; text: string };
type Props = { workspace: WorkspaceData | null; catalog: CatalogWork[]; articles: Article[]; create: () => void; navigate: (section: "projects" | "data" | "help" | "ranking" | "team" | "invites" | "contracts") => void; openArticle: (article: Article) => void };

export function WorkspaceDashboard({ workspace, catalog, articles, create, navigate, openArticle }: Props) {
  const permissions=useCompanyPermissions();
  const [banner, setBanner] = useState(true);
  const [tab, setTab] = useState("創作數據");
  const [period, setPeriod] = useState("上季度");
  const [projects,setProjects]=useState<Project[]>([]);
  const [projectError,setProjectError]=useState("");
  useEffect(()=>{let active=true;fetch("/api/creator/projects",{cache:"no-store"}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.detail||"項目讀取失敗");return data;}).then(value=>{if(active)setProjects(value);}).catch(e=>{if(active)setProjectError(e.message);});return()=>{active=false;};},[]);
  const stats={total:projects.length,submitted:projects.reduce((n,p)=>n+p.episodeCount,0),reviewing:projects.filter(p=>p.stage!=="COMPLETED").length,approved:projects.filter(p=>p.stage==="COMPLETED").length};
  const value = (n: number) => workspace ? n : "—";
  return <div className="cw-dashboard"><div className="cw-dashboard-left">
    {permissions.member&&<section className="cw-card"><h2>{roleLabel(permissions.role)}</h2><p>當前企業工作台 · 按分配身份協作</p><div className="cw-list-toolbar">{hasPermission(permissions,"traffic.view")&&<button onClick={()=>navigate("data")}>查看作品流量</button>}{hasPermission(permissions,"cooperation.view")&&<button onClick={()=>navigate("invites")}>合作邀約與草稿</button>}{hasPermission(permissions,"contract.summary.view")&&<button onClick={()=>navigate("contracts")}>查看合同摘要</button>}<button onClick={()=>navigate("team")}>查看我的權限</button></div></section>}
    {banner && <section className="cw-welcome-banner"><div className="cw-script-art"><FilePenLine size={42} strokeWidth={1.5}/></div><div><h1 className="cw-page-title">誠邀你加入「MY DREAM 原創共創」</h1><p>建立項目、確認承諾集數、逐集創作與交付，一站式管理作品</p></div><button className="cw-primary" disabled={!permissions.canEdit} onClick={create}>創建項目</button><button className="cw-icon-button" aria-label="關閉創作橫幅" onClick={() => setBanner(false)}><X size={14}/></button></section>}
    {projectError&&<p role="alert" className="cw-error">{projectError}</p>}<section className="cw-card cw-overview"><div className="cw-card-title"><h2>項目數據 <span>累計⌄</span></h2></div><div className="cw-metrics">{[{label:"承諾總集數",n:stats.submitted},{label:"創作中項目",n:stats.reviewing},{label:"已完成項目",n:stats.approved}].map(item => <div className="cw-metric" key={item.label}><div><span>{item.label} <CircleHelp size={12}/></span></div><strong>{value(item.n)}</strong></div>)}</div></section>
    <section className="cw-card cw-home-chart"><div className="cw-card-title"><div className="cw-home-tabs">{["創作數據","短劇數據"].map(label => <button key={label} className={tab === label ? "is-active" : ""} onClick={() => setTab(label)}>{label}</button>)}</div><button className="cw-text-button" disabled={!hasPermission(permissions,"traffic.view")} onClick={() => navigate("data")}>查看全部數據 <ChevronRight size={14}/></button></div><div className="cw-home-totals"><div><small>{tab === "創作數據" ? "累計項目（部）" : "平台短劇作品（部）"} <CircleHelp size={12}/></small><strong>{tab === "創作數據" ? value(stats.total) : catalog.length}</strong></div><div><small>{tab === "創作數據" ? "已完成項目（部）" : "承諾創作集數"} <CircleHelp size={12}/></small><strong>{value(tab === "創作數據" ? stats.approved : stats.submitted)}</strong></div></div><div className="cw-segment">{["上季度","近半年","近1年"].map(label => <button key={label} className={period === label ? "is-active" : ""} onClick={() => setPeriod(label)}>{label}</button>)}</div><CreationChart projects={projects} period={period}/></section>
    <section className="cw-card cw-home-scripts"><div className="cw-card-title"><h2>我的項目</h2><div><button className="cw-text-button" disabled={!permissions.canEdit} onClick={create}>創建項目 <Plus size={14}/></button><span className="cw-divider"/><button className="cw-text-button" onClick={() => navigate("projects")}>查看全部 <ChevronRight size={14}/></button></div></div>{projects.length ? <div className="cw-home-script-list">{projects.slice(0,4).map(s => <button key={s.id} onClick={() => navigate("projects")}><FilePenLine size={18}/><span>{s.title}</span><ChevronRight size={14}/></button>)}</div> : <div className="cw-home-empty"><p>暫無項目，建立項目並確認承諾集數後開始創作</p><button className="cw-primary" disabled={!permissions.canEdit} onClick={create}>創建項目</button></div>}</section>
    <section className="cw-card"><div className="cw-card-title"><h2>短劇排行榜</h2><button className="cw-text-button" onClick={() => navigate("ranking")}>查看全部 <ChevronRight size={14}/></button></div><div className="cw-home-ranking">{[...catalog].sort((a,b) => b.heat-a.heat).slice(0,20).map((work,i) => <Link key={work.id} href={`/works/${work.slug}`} target="_blank"><div className="cw-ranking-cover">{work.coverUrl && <Image src={work.coverUrl} alt="" fill sizes="72px" unoptimized/>}<b>{i+1}</b></div><div><h3>{work.title}</h3><p>{work.genre}</p><small>{work.heat.toLocaleString()} 熱度</small></div></Link>)}</div>{!catalog.length && <p className="cw-home-empty">暫無短劇作品</p>}</section>
  </div><aside className="cw-dashboard-right"><section className="cw-card cw-notices"><div className="cw-card-title"><h2>公告</h2><button className="cw-text-button" onClick={() => navigate("help")}>查看全部 <ChevronRight size={14}/></button></div><button className="cw-notice-cover" onClick={() => openArticle(articles[1])}><small>MY DREAM · 原創共創</small><b>讓好故事<br/>走向更大的舞台</b></button>{articles.map(a => <button key={a.title} className="cw-notice-row" onClick={() => openArticle(a)}><span>{a.title}</span><ChevronRight size={14}/></button>)}</section><section className="cw-card cw-resources"><div className="cw-card-title"><h2>創作活動</h2></div>{[{icon:Heart,label:"項目創作指南",a:1},{icon:BookOpen,label:"創作操作手冊",a:0},{icon:MessageSquare,label:"原創創作規範",a:2}].map(({icon:Icon,label,a},i) => <button key={label} onClick={() => openArticle(articles[a])}><span className={`cw-resource-icon cw-resource-${i}`}><Icon size={32} strokeWidth={1.7}/></span><b>{label}</b></button>)}<div className="cw-resource-note">建議您合理安排創作時間，保持健康的工作節奏，讓每一份原創故事都得到尊重。</div></section></aside></div>;
}

function CreationChart({projects,period}:{projects:Project[];period:string}) {
  const months = period === "近1年" ? 12 : period === "近半年" ? 6 : 3;
  const points = Array.from({length:months},(_,i) => {
    const today = new Date();
    const date = new Date(today.getFullYear(),today.getMonth()-months+i,1);
    const key = date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0");
    const rows=projects.filter(s => s.createdAt.startsWith(key));
    return {key,count:rows.length,approved:rows.filter(s => s.stage === "COMPLETED").length};
  });
  const ceiling = Math.max(4,...points.map(p => p.count));
  return <><div className="cw-reference-chart"><div className="cw-axis">{Array.from({length:5},(_,i) => <span key={i}>{Math.round(ceiling*(4-i)/4)}</span>)}</div><div className="cw-chart-lines">{Array.from({length:5},(_,i) => <i key={i}/>)}</div><div className="cw-month-labels">{points.map(p => <div key={p.key}><div className="cw-month-bars"><b style={{height:p.count/ceiling*150}} title={p.key+"："+p.count+" 部"}/><b className="cw-approved-bar" style={{height:p.approved/ceiling*150}} title={p.key+"："+p.approved+" 部"}/></div><span>{p.key}</span></div>)}</div></div><div className="cw-chart-legend"><i/>項目創建量 <i className="cw-purple"/>已完成項目</div></>;
}
