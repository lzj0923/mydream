"use client";

import Link from "next/link";
import {hasPermission} from "@/lib/creator-team/roles";
import {TeamTraffic} from "./team-traffic";
import {TeamBusiness} from "./team-business";
import {WorkTypeProvider} from "./work-type";
import {AccountSwitcher} from "./account-switcher";
import {CompanyTeam,CompanyPermissions,type Team} from "./company-team";
import { resetWorkspaceScroll } from "@/lib/navigation/workspace-scroll";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Grid2X2, ArrowRight, ArrowUpRight, BarChart3, Bell, Check, ChevronDown, FileCheck2, FileText, Film, FolderOpen, Headphones, Home, Menu, ShieldCheck, Sparkles, UserRound, Wallet, X } from "lucide-react";
import { VerificationNotice } from "./creator-verification";
import { WorkspaceRanking } from "./workspace-ranking";
import { WorkspaceHelp } from "./workspace-help";
import { WorkspaceDashboard } from "./workspace-dashboard";
import { FilmEmpty, SupplementaryPanel } from "./workspace-panels";
import { CreatorDataCenter } from "./data-center";
import { ContractCenter } from "./contract-center";
import { ProductionCenter } from "./production-center";
import { VideoManager } from "./video-manager";
import {useCreatorNotifications} from "./use-creator-notifications";
import { CreatorNotifications } from "./workspace-notifications";
import { SettlementCenter } from "./settlement-center";
import { type CatalogWork, type CreatorProfile, type WorkspaceData } from "./types";

type Section = "team" | "ai-tools" | "messages" | "videos" | "home" | "scripts" | "invites" | "withdrawals" | "details" | "account" | "signature" | "projects" | "data" | "settlement" | "contracts" | "profile" | "help" | "ranking";
const titles: Record<Section, string> = { team:"公司與團隊", "ai-tools": "AI 工具市場", messages: "消息中心", videos: "視頻管理", home: "工作台", scripts: "我的項目", invites: "邀約管理", withdrawals: "提現記錄", details: "作品明細", account: "賬號信息", signature: "我的署名短劇", projects: "我的項目", data: "作品收入數據", settlement: "賬戶收益", contracts: "合同管理", profile: "創作者身份信息", help: "幫助中心", ranking: "短劇熱度榜" };
const helpArticles = [
  { title: "如何建立第一個項目？", category: "新手指南", text: "在「我的項目」建立項目，填寫名稱、題材、內容形式、故事簡介及承諾集數。建立後直接進入逐集創作，按承諾集數上傳、修改和提交作品。" },
  { title: "逐集創作與交付流程", category: "創作指南", text: "建立項目後，選擇第 1 集至承諾的最後一集，逐集上傳視頻並提交驗收。收到修改意見後可上傳新版本；所有版本和交付進度均保留在項目中。認證通過後才可正式發佈。" },
  { title: "原創作品與 IP 授權須知", category: "創作規範", text: "請僅提交你擁有版權或已獲得合法授權的作品。靈感庫展示的是平台已有短劇，供研究題材與敘事方式；展示不代表授權改編。涉及改編合作，請先聯繫平台確認授權範圍。" },
  { title: "作品收入與結算說明", category: "結算說明", text: "結算中心展示當前 App 賬號的積分餘額、積分流水和提現記錄，可在賬戶收益中使用已綁定銀行卡申請提現，由 App 審核打款。作品分賬賬單待後續接入；合同管理保留入駐與項目合作文件及確認記錄；目前為演示文件，正式分成條款待確認。" },
];

async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/creator/${path}`, { method, cache: "no-store", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.detail || "操作失敗，請稍後重試"), { status: response.status });
  return result as T;
}

function Modal({ title, children, close, wide = false }: { title: string; children: ReactNode; close: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); const body = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = body; }; }, []);
  return <dialog ref={ref} className={`cw-modal${wide ? " cw-modal-wide" : ""}`} onCancel={(e) => { e.preventDefault(); close(); }} aria-labelledby="cw-modal-title"><div className="cw-modal-head"><h2 id="cw-modal-title">{title}</h2><button className="cw-icon-button" aria-label="關閉窗口" onClick={close}><X size={20} /></button></div>{children}</dialog>;
}

export function CreatorWorkspace({ catalog }: { catalog: CatalogWork[] }) {
  const [team,setTeam]=useState<Team|null>(null),[teamReady,setTeamReady]=useState(false);
  useEffect(()=>{let alive=true;const read=()=>fetch("/api/creator/team",{cache:"no-store"}).then(async r=>{if(r.status===401)return null;const d=await r.json();if(!r.ok)throw Error(d.detail||"團隊權限讀取失敗");return d;}).then(d=>{if(alive){setTeam(d);setTeamReady(true);}}).catch(()=>{if(alive){setTeamReady(false);}});void read();const id=setInterval(()=>void read(),30000);return()=>{alive=false;clearInterval(id);};},[]);
  const [section, setSection] = useState<Section>("home");
  useEffect(() => resetWorkspaceScroll(window), [section]);
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const notifications=useCreatorNotifications(!!workspace);
  const [, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [projectCreate,setProjectCreate]=useState(false);
  const [article, setArticle] = useState<(typeof helpArticles)[number] | null>(null);
  const [loginPrompt, setLoginPrompt] = useState(false);


  const refresh = useCallback(async () => {
    try { setWorkspace(await api<WorkspaceData>("workspace")); setError(""); }
    catch (e) { if ((e as { status?: number }).status === 401) setWorkspace(null); else setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    api<WorkspaceData>("workspace").then((value) => { if (active) setWorkspace(value); })
      .catch((e) => { if (active && e.status !== 401) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const applyHash = () => { const key = location.hash.slice(1).split("?")[0]; if (key === "reviews" || key === "agreements") { location.replace(`/admin/app#${key}`); return; } if (key === "ip" || key === "scripts") { setSection("projects"); history.replaceState(null, "", "#projects"); return; } if (key in titles) setSection(key as Section); };
    applyHash(); window.addEventListener("hashchange", applyHash); return () => window.removeEventListener("hashchange", applyHash);
  }, []);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 4500); return () => clearTimeout(timer); }, [notice]);


  const navigate = (key: Section) => { setSection(key); setMobile(false); setProjectCreate(false); history.replaceState(null, "", `#${key}`); };

  const create = () => { if(team?.member&&!team.canEdit){setNotice("您沒有建立項目的權限");return;} if(!workspace){setLoginPrompt(true);return;}navigate("projects");setProjectCreate(true); };
  const permitted=(key:Section)=>!team?.unavailable&&(!team?.member||["home","team","projects","messages","ai-tools","help","ranking","videos",...(hasPermission(team,"traffic.view")?["data"]:[]),...(hasPermission(team,"cooperation.view")?["invites"]:[]),...(hasPermission(team,"contract.summary.view")?["contracts"]:[])].includes(key));
  const menuItem = (key: Section, label: string, Icon: typeof Home, child = false) => !permitted(key)?null:<button key={key} className={`cw-menu-item${section === key ? " is-active" : ""}${child ? " is-child" : ""}`} onClick={() => navigate(key)} aria-current={section === key ? "page" : undefined}>{!child && <Icon size={18} strokeWidth={1.65} />}<span>{label}</span></button>;

  if(!teamReady)return <div className="cw-card"><p>正在確認賬號權限…</p><button onClick={()=>location.reload()}>重新連接</button></div>;
  return <WorkTypeProvider><CompanyPermissions.Provider value={team??{member:false,canEdit:true,canUpload:true,canSubmit:true}}><div className={`cw-app${["help","ranking","messages"].includes(section) ? " cw-wide-page" : ""}`}>
    <header className="cw-header">
      <div className="cw-brand-group"><button className="cw-mobile-menu cw-icon-button" aria-label="展開導航" onClick={() => setMobile(!mobile)}><Menu size={21} /></button><Link href="/" className="cw-brand" aria-label="MY DREAM 官網"><span className="cw-brand-symbol"><i /><i /></span><b>MY DREAM</b></Link><span className="cw-brand-divider" /><span className="cw-brand-label">創作者中心</span></div>
      <nav className="cw-top-nav" aria-label="創作者中心主導航">{([ ["home", "工作台"], ["ranking", "短劇熱度榜"], ["help", "幫助中心"] ] as const).map(([key, label]) => <button key={key} className={(key === "home" ? !["ranking", "help"].includes(section) : section === key) ? "is-active" : ""} onClick={() => navigate(key)}>{label}</button>)}</nav>
      <div className="cw-header-actions"><Link href="/" className="cw-back-site">返回官網 <ArrowUpRight size={13} /></Link><button className="cw-notification" aria-label={notifications.unread?`查看平台通知，${notifications.unread} 條未讀`:"查看平台通知"} onClick={() => navigate("messages")}><Bell size={18} />{notifications.unread>0&&<span className="cn-bell-count">{notifications.unread>99?"99+":notifications.unread}</span>}</button><AccountSwitcher team={team} name={workspace?.viewer.name||workspace?.profile.displayName||"創作者"} loggedIn={!!team||!!workspace} onLogin={()=>setLoginPrompt(true)} onManage={()=>navigate("team")}/></div>
    </header>

    <div className="cw-body">
      {mobile && <button className="cw-nav-backdrop" aria-label="關閉導航" onClick={() => setMobile(false)} />}
      <aside className={`cw-sidebar${mobile ? " is-open" : ""}`} aria-label="工作台導航">
        <div className="cw-sidebar-main">{menuItem("home", "首頁", Home)}
          {[
            {id:"project",label:"項目管理",icon:FolderOpen,items:[["projects","我的項目"],["videos","視頻管理"],["invites","邀約管理"]]},
            {id:"data",label:"數據中心",icon:BarChart3,items:[["data",team?.member?"作品流量":"作品收入數據"]]},
            {id:"settlement",label:"結算中心",icon:Wallet,items:[["settlement","賬戶收益"],["withdrawals","提現記錄"],["details","作品明細"]]},
          ].filter(group=>group.items.some(([key])=>permitted(key as Section))).map(group => <div key={group.id}>{group.id === "data" && menuItem("ai-tools", "AI 工具市場", Grid2X2)}<button className="cw-nav-group" aria-expanded={!collapsed.includes(group.id)} onClick={() => setCollapsed(value => value.includes(group.id) ? value.filter(id => id !== group.id) : [...value, group.id])}><span><group.icon size={17}/>{group.label}</span><ChevronDown size={13} className={!collapsed.includes(group.id) ? "is-expanded" : ""}/></button>{!collapsed.includes(group.id) && group.items.map(([key,label]) => menuItem(key as Section,label,FileText,true))}</div>)}
          {team?.member&&!hasPermission(team,"traffic.view")&&menuItem("ai-tools","AI 工具市場",Grid2X2)}{menuItem("team","公司與團隊",UserRound)}
          {menuItem("contracts","合同管理",FileCheck2)}
          {!team?.member&&<button className="cw-nav-group" aria-expanded={!collapsed.includes("account")} onClick={() => setCollapsed(value => value.includes("account") ? value.filter(id => id !== "account") : [...value,"account"])}><span><UserRound size={17}/>賬號與信息管理</span><ChevronDown size={13} className={!collapsed.includes("account") ? "is-expanded" : ""}/></button>}
          {!collapsed.includes("account") && <>{menuItem("account","賬號信息",UserRound,true)}{menuItem("profile","創作者身份信息",UserRound,true)}{menuItem("signature","我的署名短劇",Film,true)}</>}
        </div>
      </aside>

      <main className={`cw-main cw-section-${section}`} id="creator-main">

        {error && <div className="cw-error" role="alert">{error}<button onClick={() => { setLoading(true); void refresh(); }}>重新連接</button><button aria-label="關閉錯誤提示" onClick={() => setError("")}><X size={15} /></button></div>}

        {section==="team"?<CompanyTeam/>:!permitted(section)?<section className="cw-card"><p>此頁面未向您開放，請聯絡公司總管理員。</p><button onClick={()=>navigate("team")}>公司與團隊</button></section>:<>
        <VerificationNotice/>
        

        <VideoManager active={section === "videos"} />

        {section === "home" && <WorkspaceDashboard workspace={workspace} catalog={catalog} articles={helpArticles} create={create} navigate={navigate} openArticle={setArticle}/> }

        {section === "projects" && <ProductionCenter createRequested={projectCreate} onCreated={()=>{setProjectCreate(false);void refresh();}} />}


        {section === "ai-tools" && <section className="cw-card" aria-label="AI 工具市場" style={{ minHeight: "calc(100vh - 170px)" }}><div className="cw-card-title"><h1 className="cw-page-title">AI 工具市場</h1></div></section>}
        {section === "ranking" && <WorkspaceRanking catalog={catalog}/> }


        {section === "messages" && <CreatorNotifications feed={notifications}/> }
        {section === "data" && (team?.member?<TeamTraffic key={JSON.stringify(team.permissions)}/>:<CreatorDataCenter />)}

        {(section === "settlement" || section === "withdrawals") && <SettlementCenter key={section} initialTab={section === "withdrawals" ? "withdrawals" : "points"} />}
        {section === "details" && <CreatorDataCenter detailsOnly />}
        {section==="invites"&&team?.company?<TeamBusiness/>:["invites", "account", "signature"].includes(section)&&<SupplementaryPanel section={section} workspace={workspace} navigate={navigate}/> }
        {section === "contracts" && (team?.member?<TeamBusiness contractsOnly/>:<ContractCenter admin={Boolean(workspace?.viewer.admin)} />)}

        {section === "profile" && <section className="cw-card"><p><Link className="cw-primary" href="/creator/verification">查看或補充身份認證</Link></p>{workspace ? <ProfileForm profile={workspace.profile} done={() => { void refresh(); setNotice("創作者資料已保存"); }} /> : <Empty icon={<UserRound />} title="建立你的創作者名片" text="登錄後設置筆名、擅長題材和個人介紹。" action={<button className="cw-primary" onClick={() => setLoginPrompt(true)}>登錄並完善資料</button>} />}</section>}
        {section === "help" && <WorkspaceHelp articles={helpArticles} open={setArticle}/> }

        
        </>}
        <footer className="cw-footer"><span>© {new Date().getFullYear()} MY DREAM · 創作者中心</span><div><Link href="/privacy">隱私政策</Link><Link href="/contact">聯繫平台</Link><button onClick={() => navigate("help")}>幫助與反饋</button></div></footer>
      </main>
    </div>
    <div className="cw-floating-service"><button onClick={() => navigate("help")}><Headphones size={20}/><span>客服中心</span></button><Link href="/contact"><FileText size={18}/><span>深度合作</span></Link></div>
    {notice && <div className="cw-toast" role="status"><Check size={17} />{notice}</div>}
    {article && <Modal title={article.title} close={() => setArticle(null)}><div className="cw-article"><span className="cw-pill">{article.category}</span><p>{article.text}</p><button className="cw-primary" onClick={() => setArticle(null)}>我知道了 <Check size={16} /></button></div></Modal>}
    {loginPrompt && <Modal title="歡迎來到 MY DREAM 創作者中心" close={() => setLoginPrompt(false)}><div className="cw-login-prompt"><span className="cw-empty-icon"><Sparkles size={32} /></span><h3>讓靈感擁有自己的舞台</h3><p>使用獨立的 MY DREAM 創作者賬號登錄，即可建立項目、逐集創作和跟進交付。</p><Link className="cw-primary" href="/creator/login?next=/creator/workspace">使用創作者賬號登錄 <ArrowRight size={16} /></Link><Link className="cw-text-button" href="/admin/site">平台管理員登錄 <ArrowUpRight size={14} /></Link></div></Modal>}

  </div></CompanyPermissions.Provider></WorkTypeProvider>;
}

function Empty({ title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return <FilmEmpty title={title}><span>{text}</span>{action}</FilmEmpty>;
}

function ProfileForm({ profile, done }: { profile: CreatorProfile; done: () => void }) {
  const [value, setValue] = useState(profile); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(""); try { await api("profile", "PUT", value); done(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };
  return <form className="cw-profile-form cw-editor" onSubmit={submit}><div className="cw-profile-heading"><span className="cw-avatar"><UserRound size={30} /></span><div><h1 className="cw-page-title">我的創作者名片</h1><p>填寫你的筆名與擅長領域，讓編輯更瞭解你。</p></div></div>{error && <div className="cw-error" role="alert">{error}</div>}<label>創作者名稱<input required maxLength={80} value={value.displayName} onChange={(e) => setValue({ ...value, displayName: e.target.value })} /></label><label>擅長題材<input maxLength={120} value={value.specialty} placeholder="例如：都市情感、懸疑、科幻" onChange={(e) => setValue({ ...value, specialty: e.target.value })} /></label><label>個人介紹<textarea rows={5} maxLength={1000} value={value.bio} placeholder="分享你的創作經歷、風格和興趣…" onChange={(e) => setValue({ ...value, bio: e.target.value })} /></label><div className="cw-info-strip"><ShieldCheck size={17} />這是創作資料，不代表平台實名認證或版權認證。</div><button className="cw-primary" disabled={busy}>{busy ? "正在保存…" : "保存資料"}</button></form>;
}



