/* eslint-disable @next/next/no-img-element -- media URLs are managed dynamically by the Java CMS. */
"use client";
import { NavigationHeroPanel } from "./navigation-hero-panel";
import {defaultProtectionBlocks,protectionPagePath} from "@/content/cms/protection-page-settings";
import {aboutPlanProps,planPrefixes,aboutTextOffset} from "@/content/cms/about-plan";

import {
  Aperture, BookOpen, Boxes, ChevronRight, CircleGauge, FileText,
  Image as ImageIcon, LayoutDashboard, LogOut, Menu, Navigation,
  ListVideo, Palette, Plus, RefreshCw, Rocket, Save, ShieldCheck, Trash2,
  Upload, Users, X,
} from "lucide-react";
import Link from "next/link";


import "./creator-reviews.css";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { publishLatestDraft, verifyPublishedFooterCopyright } from "@/content/cms/admin-publish";
import { ensureHomeSectionBlocks } from "@/content/cms/home-section-settings";
import { backgroundPages, defaultBackgroundBlocks } from "@/content/cms/background-page-settings";
import { allWorksHeroBackground, defaultWorksSectionBlocks } from "@/content/cms/works-page-settings";
import { JygPrototypeHome } from "@/components/prototype/jyg-home";
import { Footer } from "@/components/layout/footer";
import { buildJygHomeHeroModel } from "@/features/jyg/home-hero-model";
import { normalizeWorkGenres } from "@/features/jyg/home-featured-works-model";
import { NEWS_CATEGORY_LABELS, newsCategoryId, newsCategoryLabel } from "@/features/jyg/news-categories";
import type { CmsPage } from "@/content/cms/java-cms-client";
import { defaultFooterSettings, resolveFooterSettings, type FooterSettings } from "@/content/cms/footer-settings";
import { duplicateEpisodeNumbers, nextVisibleEpisodeNumber } from "@/features/admin/episode-batch-model";
import { nextAvailableContentSlug } from "@/features/admin/content-slug";
import { aiCommunityInviteHref } from "@/lib/app-links";

type Json = Record<string, unknown>;
type Session = { email: string; authorities: string[] };
type Site = { id: string; key: string; name: string; host: string; locale: string; lockVersion: number };
type PageSummary = { id: string; path: string; pageKey: string; locale: string; title: string; archived: boolean; lockVersion: number };
type BlockDraft = { id?: string; type: string; schemaVersion: number; zone: string; order: number; visible: boolean; props: Json; style: Json };
type PageDraft = PageSummary & { version: number; status: string; seo: Json; blocks: BlockDraft[] };
type ContentRelation = { type: string; targetContentId: string; targetTitle?: string; order: number };
type ContentSummary = { id: string; type: string; slug: string; locale: string; title: string; featured: boolean; archived: boolean; lockVersion: number; relatedWorkId?: string; relatedWorkTitle?: string; episodeNumber?: string; publishedAt?: string };
type ContentDraft = ContentSummary & { summary?: string; coverMediaId?: string; data: Json; sortWeight: number; version: number; status: string; relations?: ContentRelation[] };
type NewsBodyBlock = { id: string; type: "heading1" | "heading2" | "paragraph" | "quote" | "image"; text: string; imageMediaId: string; alt: string; caption: string };
type Identity = { id: string; key: string; name: string; lockVersion: number };
type NavItem = { id?: string; parentId?: string; label: string; linkType: string; linkValue: string; target: string; order: number; visible: boolean };
type NavDraft = Identity & { version: number; items: NavItem[] };
type JsonDraft = Identity & { version: number; value: Json };
type Media = { id: string; type: string; displayName: string; originalName: string; url: string; mimeType: string; size: number; altText?: string; caption?: string; status: string; lockVersion: number; createdAt: string };
type Release = { id: string; releaseNo: number; status: string; changeNote?: string; publishedAt: string; active: boolean };
type Submission = { id: string; formKey: string; payload: Json; status: string; emailStatus: string; emailRecipient?: string; emailSentAt?: string; emailError?: string; sourcePath: string; createdAt: string };
type FormNotificationSettings = { formKey: string; recipientEmail: string; enabled: boolean; smtpConfigured: boolean; lockVersion: number };
type User = { id: string; email: string; displayName: string; status: string; roles: string[]; createdAt: string };
type Font = { id: string; name: string; fallbackStack: string; enabled: boolean; faces: { mediaId: string; weight: number; style: string; format: string }[] };
type Tab = "hero-style" | "verification" | "reviews" | "agreements" | "deliveries" | "interests" | "overview" | "pages" | "content" | "episodes" | "universe" | "news" | "navigation" | "footer" | "appearance" | "media" | "forms" | "users" | "releases";
type UniverseContentType = "original-video" | "tutorial" | "inspiration";

const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "工作台", icon: LayoutDashboard },
  { id: "hero-style", label: "首屏文字統一設置", icon: Palette },
  { id: "pages", label: "頁面文字與樣式", icon: Palette },
  { id: "content", label: "作品管理", icon: BookOpen },
  { id: "episodes", label: "劇集內容", icon: ListVideo },
  { id: "universe", label: "AI宇宙內容", icon: CircleGauge },
  { id: "news", label: "消息管理", icon: FileText },
  { id: "navigation", label: "導航欄", icon: Navigation },
  { id: "footer", label: "底部欄", icon: Boxes },
  { id: "appearance", label: "外觀與字體", icon: Palette },
  { id: "media", label: "圖片和媒體庫", icon: ImageIcon },
  { id: "forms", label: "表單線索", icon: FileText },
  { id: "users", label: "管理員", icon: Users },
  { id: "releases", label: "版本記錄", icon: Rocket },
];

const formatBytes = (value: number) => value > 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(value / 1024)} KB`;
const formatDate = (value?: string) => value ? new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const mediaLabel = (item: Media) => `${item.displayName || item.originalName} · ${{ IMAGE: "圖片", VIDEO: "視頻", AUDIO: "音頻", FONT: "字體", DOCUMENT: "文檔" }[item.type] ?? item.type}`;
const workGenreOptions = ["古風", "都市", "漫劇", "奇幻", "穿越", "重生", "懸疑", "宮鬥宅鬥", "女性成長", "逆襲", "校園", "腦洞", "現代"] as const;
const newsBlock = (type: NewsBodyBlock["type"], id = `news-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`): NewsBodyBlock => ({ id, type, text: "", imageMediaId: "", alt: "", caption: "" });
const newsBodyBlocks = (value: unknown): NewsBodyBlock[] => Array.isArray(value) ? value.map((entry, index) => {
  const block = entry && typeof entry === "object" && !Array.isArray(entry) ? entry as Json : {};
  const type = ["heading1", "heading2", "paragraph", "quote", "image"].includes(String(block.type)) ? String(block.type) as NewsBodyBlock["type"] : "paragraph";
  return { id: String(block.id ?? `news-block-${index + 1}`), type, text: String(block.text ?? ""), imageMediaId: String(block.imageMediaId ?? ""), alt: String(block.alt ?? ""), caption: String(block.caption ?? "") };
}) : [];

export function AdminConsole({ apiBase, siteOnly = false, initialTab = "overview" }: { apiBase: string; siteOnly?: boolean; initialTab?: Tab }) {
  const [session, setSession] = useState<Session | null>();
  const [tab, setTab] = useState<Tab>(initialTab);
  useEffect(() => { const apply = () => { const value=location.hash.slice(1).split("?")[0]; if(tabs.some(t=>t.id===value)) setTab(value as Tab); };apply();window.addEventListener("hashchange",apply);return()=>window.removeEventListener("hashchange",apply); }, []);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [site, setSite] = useState<Site | null>(null);
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [content, setContent] = useState<ContentSummary[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [navs, setNavs] = useState<Identity[]>([]);
  const [themes, setThemes] = useState<Identity[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [fonts, setFonts] = useState<Font[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; message: string } | null>(null);
  const [editor, setEditor] = useState<ReactNode>(null);

  const request = useCallback(async <T,>(path: string, options: RequestInit = {}, csrf = false): Promise<T> => {
    const headers = new Headers(options.headers);
    if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
    if (csrf) {
      const tokenResponse = await fetch(`${apiBase}/admin-api/v1/auth/csrf`, { credentials: "include" });
      if (!tokenResponse.ok) throw new Error("無法獲取安全令牌");
      const token = await tokenResponse.json() as { headerName: string; token: string };
      headers.set(token.headerName, token.token);
    }
    const response = await fetch(`${apiBase}${path}`, { ...options, headers, credentials: "include" });
    if (!response.ok) {
      const problem = await response.json().catch(() => ({})) as { detail?: string; title?: string };
      throw new Error(problem.detail ?? problem.title ?? `請求失敗（${response.status}）`);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }, [apiBase]);

  const flash = (message: string, tone: "ok" | "error" = "ok") => {
    setNotice({ message, tone });
    window.setTimeout(() => setNotice(null), 3200);
  };

  const loadWorkspace = useCallback(async (siteId: string) => {
    setBusy(true);
    const guarded = async <T,>(path: string, fallback: T) => request<T>(path).catch(() => fallback);
    try {
      const [pageRows, contentRows, mediaRows, releaseRows, navigationRows, themeRows, submissionRows, userRows, fontRows] = await Promise.all([
        guarded(`/admin-api/v1/sites/${siteId}/pages`, [] as PageSummary[]),
        guarded(`/admin-api/v1/sites/${siteId}/content`, [] as ContentSummary[]),
        guarded(`/admin-api/v1/sites/${siteId}/media`, [] as Media[]),
        guarded(`/admin-api/v1/sites/${siteId}/releases`, [] as Release[]),
        guarded(`/admin-api/v1/sites/${siteId}/navigations`, [] as Identity[]),
        guarded(`/admin-api/v1/sites/${siteId}/themes`, [] as Identity[]),
        guarded(`/admin-api/v1/sites/${siteId}/submissions`, [] as Submission[]),
        guarded("/admin-api/v1/users", [] as User[]),
        guarded(`/admin-api/v1/sites/${siteId}/fonts`, [] as Font[]),
      ]);
      setPages(pageRows); setContent(siteOnly ? contentRows.filter(item => !["work", "episode", "original-video"].includes(item.type)) : contentRows); setMedia(mediaRows); setReleases(releaseRows);
      setNavs(navigationRows); setThemes(themeRows); setSubmissions(submissionRows); setUsers(userRows);
      setFonts(fontRows);
    } finally { setBusy(false); }
  }, [request, siteOnly]);

  const initialize = useCallback(async () => {
    const siteRows = await request<Site[]>("/admin-api/v1/sites");
    setSites(siteRows);
    const selected = siteRows[0] ?? null;
    setSite(selected);
    if (selected) await loadWorkspace(selected.id);
  }, [loadWorkspace, request]);

  useEffect(() => {
    request<Session>("/admin-api/v1/auth/me")
      .then(async (value) => { setSession(value); await initialize(); })
      .catch(() => setSession(null));
  }, [initialize, request]);

  const login = async (email: string, password: string) => {
    setBusy(true);
    try {
      const value = await request<Session>("/admin-api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      setSession(value);
      await initialize();
    } catch (error) { flash(error instanceof Error ? error.message : "登錄失敗", "error"); }
    finally { setBusy(false); }
  };

  const logout = async () => {
    await request("/admin-api/v1/auth/logout", { method: "POST" }, true).catch(() => undefined);
    setSession(null); setSites([]); setSite(null);
  };

  if (session === undefined) return <Splash message="正在連接內容中心" />;
  if (!session) return <LoginScreen onLogin={login} busy={busy} notice={notice} />;

  const refresh = () => site && loadWorkspace(site.id).then(() => flash("數據已刷新")).catch((error: Error) => flash(error.message, "error"));
  const switchSite = async (id: string) => {
    const selected = sites.find((item) => item.id === id) ?? null;
    setSite(selected);
    if (selected) await loadWorkspace(selected.id);
  };
  const deleteWork = async (item: ContentSummary) => {
    if (!site || !window.confirm(`確認刪除作品“${item.title}”？刪除後會立即從前台下架。`)) return;
    setBusy(true);
    try {
      await request(`/admin-api/v1/content/${encodeURIComponent(item.id)}?lockVersion=${item.lockVersion}`, { method: "DELETE" }, true);
      await publishLatestDraft(request, site.id, `刪除官網作品：${item.title}`);
      await loadWorkspace(site.id);
      flash("作品已刪除並從官網下架");
    } catch (error) { flash(message(error), "error"); }
    finally { setBusy(false); }
  };
  const deleteEpisode = async (item: ContentSummary) => {
    if (!site || !window.confirm(`確認刪除“${item.title}”？刪除後會從所屬作品選集下架。`)) return;
    setBusy(true);
    try {
      await request(`/admin-api/v1/content/${encodeURIComponent(item.id)}?lockVersion=${item.lockVersion}`, { method: "DELETE" }, true);
      await publishLatestDraft(request, site.id, `刪除官網劇集：${item.title}`);
      await loadWorkspace(site.id);
      flash("劇集已刪除並從官網下架");
    } catch (error) { flash(message(error), "error"); }
    finally { setBusy(false); }
  };
  const deleteNews = async (item: ContentSummary) => {
    if (!site || !window.confirm(`確認刪除消息“${item.title}”？刪除後會立即從消息列表下架。`)) return;
    setBusy(true);
    try {
      await request(`/admin-api/v1/content/${encodeURIComponent(item.id)}?lockVersion=${item.lockVersion}`, { method: "DELETE" }, true);
      await publishLatestDraft(request, site.id, `刪除官網消息：${item.title}`);
      await loadWorkspace(site.id);
      flash("消息已刪除並從官網下架");
    } catch (error) { flash(message(error), "error"); }
    finally { setBusy(false); }
  };
  const deleteUniverseContent = async (item: ContentSummary) => {
    if (!site || !window.confirm(`確認刪除 AI 宇宙內容“${item.title}”？刪除後會立即從前台下架。`)) return;
    setBusy(true);
    try {
      await request(`/admin-api/v1/content/${encodeURIComponent(item.id)}?lockVersion=${item.lockVersion}`, { method: "DELETE" }, true);
      await publishLatestDraft(request, site.id, `刪除 AI 宇宙內容：${item.title}`);
      await loadWorkspace(site.id);
      flash("AI 宇宙內容已刪除並下架");
    } catch (error) { flash(message(error), "error"); }
    finally { setBusy(false); }
  };

  return <div className="cms-admin">
    {notice ? <div className={`admin-toast admin-toast--${notice.tone}`}>{notice.message}</div> : null}
    <aside className={`admin-sidebar ${sidebarOpen ? "is-open" : ""}`}>
      <div className="admin-brand"><span className="admin-brand__mark">MD</span><span><b>MY DREAM</b><small>官網內容管理</small></span></div>
      <nav aria-label="後台功能">
        {tabs.filter(item => !siteOnly || !["content", "episodes"].includes(item.id)).map((item) => <button key={item.id} type="button" className={tab === item.id ? "is-active" : ""} onClick={() => { setTab(item.id); history.replaceState(null,"",`#${item.id}`); setSidebarOpen(false); }}>
          <item.icon size={18} /><span>{item.label}</span>{tab === item.id ? <ChevronRight size={15} /> : null}
        </button>)}
      </nav>
      <div className="admin-sidebar__footer"><div className="admin-user"><span>{session.email.slice(0, 1).toUpperCase()}</span><div><b>{session.email}</b><small>已安全登錄</small></div></div><button type="button" onClick={logout} aria-label="退出登錄"><LogOut size={18} /></button></div>
    </aside>
    <div className="admin-main">
      <header className="admin-topbar">
        <button className="admin-menu" type="button" onClick={() => setSidebarOpen(true)} aria-label="打開菜單"><Menu /></button>
        <div><p>{siteOnly ? "官網內容管理" : "官網管理"}</p><h1>{tabs.find((item) => item.id === tab)?.label}</h1></div>
        <div className="admin-topbar__actions">
          {sites.length > 1 ? <select value={site?.id} onChange={(event) => switchSite(event.target.value)}>{sites.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select> : <span className="admin-site-pill"><span />{site?.name ?? "未選擇站點"}</span>}
          <button type="button" className="admin-icon-button" onClick={refresh} aria-label="刷新"><RefreshCw size={17} className={busy ? "is-spinning" : ""} /></button>
          <Link className="admin-preview" href="/admin">選擇管理系統 <ChevronRight size={15} /></Link>
          <a className="admin-preview" href="/" target="_blank">查看官網 <ChevronRight size={15} /></a>
        </div>
      </header>
      <main className="admin-content">
        {busy ? <div className="admin-progress" /> : null}
        {tab === "overview" && <Overview pages={pages} content={content} media={media} submissions={submissions} releases={releases} onNavigate={setTab} />}
        {tab === "pages" && <PagesPanel pages={pages} onEdit={async (id, path = "/works") => {
          try {
            const isProtection = path === protectionPagePath;
            const backgroundPage = backgroundPages.find(item => item.path === path);
            const title = backgroundPage?.title ?? (isProtection ? "專案保護" : "全部作品");
            const page = id ? await request<PageDraft>(`/admin-api/v1/pages/${id}`) : await request<PageDraft>(`/admin-api/v1/sites/${site!.id}/pages`, {
              method: "POST", body: JSON.stringify({ path, pageKey: backgroundPage?.pageKey ?? (isProtection ? "professional-rights" : "all-works"), locale: site!.locale, title, seo: { title }, blocks: backgroundPage ? defaultBackgroundBlocks() : isProtection ? defaultProtectionBlocks() : defaultWorksSectionBlocks(), changeNote: `啟用${title}頁面編輯` }),
            }, true);
            setEditor(<PageEditor api={request} site={site!} page={page} media={media} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); refresh(); }} flash={flash} />);
            if (!id) refresh();
          } catch (error) { flash(message(error), "error"); refresh(); }
        }} />}
        {tab === "content" && <ContentPanel content={content} onCreate={() => setEditor(<ContentEditor api={request} site={site!} media={media} existingSlugs={content.filter((item) => item.type === "work").map((item) => item.slug)} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); refresh(); }} flash={flash} />)} onEdit={async (id) => { const value = await request<ContentDraft>(`/admin-api/v1/content/${id}`); setEditor(<ContentEditor api={request} site={site!} media={media} existingSlugs={content.filter((item) => item.type === "work").map((item) => item.slug)} value={value} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); refresh(); }} flash={flash} />); }} onDelete={deleteWork} />}
        {tab === "episodes" && <EpisodePanel content={content} onCreate={() => setEditor(<EpisodeEditor api={request} site={site!} works={content.filter((item) => item.type === "work" && !item.archived)} media={media} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); refresh(); }} flash={flash} />)} onBatchCreate={() => setEditor(<BatchEpisodeUploader api={request} site={site!} works={content.filter((item) => item.type === "work" && !item.archived)} content={content} media={media} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); refresh(); }} flash={flash} />)} onEdit={async (id) => { const value = await request<ContentDraft>(`/admin-api/v1/content/${id}`); setEditor(<EpisodeEditor api={request} site={site!} works={content.filter((item) => item.type === "work" && !item.archived)} media={media} value={value} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); refresh(); }} flash={flash} />); }} onDelete={deleteEpisode} />}
        {tab === "universe" && <UniverseContentPanel siteOnly={siteOnly} content={content} onCreate={(type) => setEditor(<UniverseContentEditor siteOnly={siteOnly} api={request} site={site!} media={media} existingSlugs={content.filter((item) => item.type === type).map((item) => item.slug)} initialType={type} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); refresh(); }} flash={flash} />)} onEdit={async (id) => { const value = await request<ContentDraft>(`/admin-api/v1/content/${id}`); setEditor(<UniverseContentEditor siteOnly={siteOnly} api={request} site={site!} media={media} existingSlugs={content.filter((item) => item.type === value.type).map((item) => item.slug)} value={value} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); refresh(); }} flash={flash} />); }} onDelete={deleteUniverseContent} />}
        {tab === "news" && <NewsPanel content={content} onCreate={() => setEditor(<NewsEditor api={request} site={site!} media={media} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); refresh(); }} flash={flash} />)} onEdit={async (id) => { const value = await request<ContentDraft>(`/admin-api/v1/content/${id}`); setEditor(<NewsEditor api={request} site={site!} media={media} value={value} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); refresh(); }} flash={flash} />); }} onDelete={deleteNews} />}
        {tab === "navigation" && <NavigationPanel site={site!} identities={navs} api={request} onSaved={refresh} flash={flash} />}
        {tab === "footer" && <FooterPanel site={site!} media={media} api={request} onSaved={refresh} flash={flash} />}
        {tab === "hero-style" && <NavigationHeroPanel site={site!} api={request} />}
        {tab === "appearance" && <AppearancePanel site={site!} themes={themes} fonts={fonts} media={media} api={request} onSaved={refresh} flash={flash} />}
        {tab === "media" && <MediaPanel site={site!} media={media} api={request} onSaved={refresh} flash={flash} />}
        {tab === "forms" && <FormsPanel site={site!} submissions={submissions} api={request} onSaved={refresh} flash={flash} />}
        {tab === "users" && <UsersPanel site={site!} users={users} api={request} onSaved={refresh} flash={flash} />}
        {tab === "releases" && <ReleasesPanel releases={releases} api={request} onSaved={refresh} flash={flash} />}
      </main>
    </div>
    {sidebarOpen ? <button className="admin-backdrop" type="button" onClick={() => setSidebarOpen(false)} aria-label="關閉菜單" /> : null}
    {editor}
  </div>;
}

function LoginScreen({ onLogin, busy, notice }: { onLogin: (email: string, password: string) => Promise<void>; busy: boolean; notice: { tone: string; message: string } | null }) {
  const [email, setEmail] = useState("admin@mydream.local");
  const [password, setPassword] = useState("");
  return <main className="admin-login admin-login--site">
    <div className="admin-login__visual"><div className="admin-orbit"><span /><span /><Aperture /></div><div><p>MY DREAM · WEBSITE MANAGEMENT</p><h1>官網內容<br />管理後台</h1><span>官網頁面、媒體素材、內容與平台配置。</span></div></div>
    <div className="admin-login__panel"><form onSubmit={(event) => { event.preventDefault(); void onLogin(email, password); }}>
      <div className="admin-login__logo"><span>MD</span><div><b>MY DREAM</b><small>官網內容管理</small></div></div>
      <p className="admin-kicker">WEBSITE ADMINISTRATION</p><h2>官網管理員登錄</h2><p className="admin-muted">使用獨立的官網管理員郵箱與密碼，無需登錄 App 後台</p>
      <label>郵箱地址<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label>
      <label>登錄密碼<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required autoFocus /></label>
      {notice?.tone === "error" ? <p className="admin-form-error">{notice.message}</p> : null}
      <button className="admin-primary admin-primary--wide" type="submit" disabled={busy}>{busy ? "正在驗證…" : <>登錄官網管理後台 <ChevronRight size={17} /></>}</button>
      <p><Link href="/admin">返回系統選擇</Link> · <Link href="/admin/app">前往 App 管理登錄</Link></p>
      <p className="admin-login__security"><ShieldCheck size={15} /> 管理操作受到權限、CSRF 與審計記錄保護</p>
    </form></div>
  </main>;
}

function Splash({ message }: { message: string }) { return <main className="admin-splash"><div className="admin-splash__mark">MD</div><p>{message}</p></main>; }

function Overview({ pages, content, media, submissions, releases, onNavigate }: { pages: PageSummary[]; content: ContentSummary[]; media: Media[]; submissions: Submission[]; releases: Release[]; onNavigate: (tab: Tab) => void }) {
  const active = releases.find((item) => item.active);
  const cards = [
    { label: "固定頁面", value: pages.length, icon: Boxes, tab: "pages" as Tab, hint: "文字、顏色與字號" },
    { label: "作品", value: content.filter((item) => item.type === "work").length, icon: BookOpen, tab: "content" as Tab, hint: "卡片、封面與上下架" },
    { label: "圖片和媒體", value: media.length, icon: ImageIcon, tab: "media" as Tab, hint: "圖片、視頻與字體" },
    { label: "新線索", value: submissions.filter((item) => item.status === "NEW").length, icon: FileText, tab: "forms" as Tab, hint: "等待處理的表單" },
  ];
  return <div className="admin-stack">
    <section className="admin-hero-card"><div><p className="admin-kicker">GOOD DAY, CREATOR</p><h2>官網內容，盡在掌握。</h2><p>頁面佈局保持不變，保存文字、樣式或作品後立即更新官網。</p><div className="admin-hero-card__actions"><button className="admin-primary" onClick={() => onNavigate("pages")}><Palette size={17} />微調頁面</button><button className="admin-secondary" onClick={() => onNavigate("releases")}><Rocket size={17} />查看歷史版本</button></div></div><div className="admin-release-orb"><span>LIVE</span><strong>R{active?.releaseNo ?? 0}</strong><small>{active ? formatDate(active.publishedAt) : "等待首次保存"}</small></div></section>
    <section className="admin-stat-grid">{cards.map((card) => <button key={card.label} className="admin-stat" onClick={() => onNavigate(card.tab)}><span><card.icon size={20} /></span><div><small>{card.label}</small><strong>{card.value}</strong><p>{card.hint}</p></div><ChevronRight size={17} /></button>)}</section>
    <section className="admin-two-column"><Panel title="最近更新" eyebrow="CONTENT ACTIVITY"><div className="admin-list">{[...pages.slice(0, 3).map((item) => ({ id: item.id, title: item.title, meta: `頁面 · ${item.path}` })), ...content.slice(0, 3).map((item) => ({ id: item.id, title: item.title, meta: `${item.type} · ${item.slug}` }))].slice(0, 5).map((item) => <div className="admin-list-row" key={item.id}><span className="admin-list-icon"><FileText size={16} /></span><div><b>{item.title}</b><small>{item.meta}</small></div><span className="admin-status admin-status--ok">保存即生效</span></div>)}</div></Panel><Panel title="官網狀態" eyebrow="DELIVERY"><div className="admin-publish-summary"><CircleGauge size={42} /><strong>當前版本 R{active?.releaseNo ?? 0}</strong><p>後台每次保存都會直接更新官網，同時自動保留歷史版本以便恢復。</p><button className="admin-secondary" onClick={() => onNavigate("releases")}>查看歷史版本 <ChevronRight size={15} /></button></div></Panel></section>
  </div>;
}

function PagesPanel({ pages, onEdit }: { pages: PageSummary[]; onEdit: (id?: string, path?: string) => Promise<void> }) {
  const [opening, setOpening] = useState<string | null>(null);
  const missing = [...backgroundPages, {path:"/works",pageKey:"all-works",title:"全部作品"},{path:protectionPagePath,pageKey:"professional-rights",title:"專案保護"}].filter(item=>!pages.some(page=>page.path===item.path));
  const rows = [...pages,...missing.map(item=>({...item,id:"",archived:false}))];
  const open = async (id: string, path: string) => {
    if (opening) return;
    setOpening(path);
    try { await onEdit(id || undefined, path); } finally { setOpening(null); }
  };
  return <Panel title="頁面文字與樣式" eyebrow="FIXED LAYOUT TUNING"><p className="admin-panel-note">頁面佈局已經鎖定。這裡只能調整現有位置的文字、背景、顏色、字號和間距，不會新增或破壞頁面結構。</p><Table headers={["固定頁面", "訪問地址", "可管理內容", "狀態", ""]}>{rows.map((page) => <tr key={page.id || page.path}><td><b>{page.title}</b><small>{page.pageKey}</small></td><td><code>{page.path}</code></td><td>{page.path === "/works" ? "首屏與作品列表 · 標題 · 介紹 · 背景" : "文案 · 背景 · 顏色 · 字號 · 間距"}</td><td><span className="admin-status admin-status--ok">{page.archived ? "已停用" : "佈局已鎖定"}</span></td><td><button className="admin-row-action" disabled={opening !== null} onClick={() => void open(page.id, page.path)}>{opening === page.path ? "正在開啟…" : "開始微調"} <ChevronRight size={15} /></button></td></tr>)}</Table></Panel>;
}

function ContentPanel({ content, onCreate, onEdit, onDelete }: { content: ContentSummary[]; onCreate: () => void; onEdit: (id: string) => void; onDelete: (item: ContentSummary) => void }) {
  const [query, setQuery] = useState("");
  const works = content.filter((item) => item.type === "work" && !item.archived);
  const rows = works.filter((item) => `${item.title}${item.slug}`.toLowerCase().includes(query.toLowerCase()));
  return <Panel title="作品管理" eyebrow="WORK CRUD MANAGEMENT" action={<><input className="admin-search" placeholder="按名稱或標識查詢…" value={query} onChange={(event) => setQuery(event.target.value)} /><button className="admin-primary" onClick={onCreate}><Plus size={17} />新增作品</button></>}><p className="admin-panel-note">支持新增、查詢、查看編輯和刪除作品。保存或刪除後會直接更新首頁作品卡片；頁面網格佈局保持不變。</p><Table headers={["作品", "唯一標識", "展示狀態", "首頁推薦", "操作"]}>{rows.map((item) => <tr key={item.id}><td><b>{item.title}</b><small>{item.locale}</small></td><td><code>{item.slug}</code></td><td><span className="admin-status admin-status--ok">已保存</span></td><td>{item.featured ? <span className="admin-status admin-status--gold">推薦</span> : "普通"}</td><td><div className="admin-row-actions"><button className="admin-row-action" onClick={() => onEdit(item.id)}>查看/編輯 <ChevronRight size={15} /></button><button className="admin-delete-action" onClick={() => onDelete(item)} aria-label={`刪除作品${item.title}`}><Trash2 size={15} />刪除</button></div></td></tr>)}</Table>{rows.length === 0 ? <Empty icon={<BookOpen />} title={query ? "沒有符合條件的作品" : "還沒有作品"} action={query ? undefined : onCreate} /> : null}</Panel>;
}

function EpisodePanel({ content, onCreate, onBatchCreate, onEdit, onDelete }: { content: ContentSummary[]; onCreate: () => void; onBatchCreate: () => void; onEdit: (id: string) => void; onDelete: (item: ContentSummary) => void }) {
  const [query, setQuery] = useState("");
  const episodes = content.filter((item) => item.type === "episode" && !item.archived);
  const rows = episodes.filter((item) => `${item.title}${item.relatedWorkTitle ?? ""}${item.episodeNumber ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  return <Panel title="劇集內容管理" eyebrow="WORK EPISODE CRUD" action={<><input className="admin-search" placeholder="搜索作品或劇集…" value={query} onChange={(event) => setQuery(event.target.value)} /><button className="admin-secondary" onClick={onBatchCreate}><Upload size={17} />批量添加劇集</button><button className="admin-primary" onClick={onCreate}><Plus size={17} />新增一集</button></>}><p className="admin-panel-note">每一集獨立管理，並關聯到一個作品。支持先批量建立集數資料，視頻可稍後在單集編輯中補充；已上架的劇集只進入對應作品選集。</p><Table headers={["劇集", "所屬作品", "集數", "操作"]}>{rows.map((item) => <tr key={item.id}><td><b>{item.title}</b><small>{item.publishedAt || "未設置上架日期"}</small></td><td><b>{item.relatedWorkTitle || "未關聯"}</b><small>{item.relatedWorkId || "—"}</small></td><td><span className="admin-status admin-status--gold">EP {item.episodeNumber || "—"}</span></td><td><div className="admin-row-actions"><button className="admin-row-action" onClick={() => onEdit(item.id)}>查看/編輯 <ChevronRight size={15} /></button><button className="admin-delete-action" onClick={() => onDelete(item)}><Trash2 size={15} />刪除</button></div></td></tr>)}</Table>{rows.length === 0 ? <Empty icon={<ListVideo />} title={query ? "沒有符合條件的劇集" : "還沒有劇集內容"} action={query ? undefined : onCreate} /> : null}</Panel>;
}

function NewsPanel({ content, onCreate, onEdit, onDelete }: { content: ContentSummary[]; onCreate: () => void; onEdit: (id: string) => void; onDelete: (item: ContentSummary) => void }) {
  const [query, setQuery] = useState("");
  const articles = content.filter((item) => item.type === "article" && !item.archived);
  const rows = articles.filter((item) => `${item.title}${item.slug}${item.publishedAt ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  return <Panel title="消息內容管理" eyebrow="NEWS CRUD & SEO" action={<><input className="admin-search" placeholder="查詢標題、標識或日期…" value={query} onChange={(event) => setQuery(event.target.value)} /><button className="admin-primary" onClick={onCreate}><Plus size={17} />新增消息</button></>}>
    <p className="admin-panel-note">管理官網最新消息與 SEO 文章。支持標題、二級標題、封面、正文圖片、結構化內容、搜索信息和發佈順序。</p>
    <Table headers={["消息", "唯一標識", "發佈日期", "推薦狀態", "操作"]}>{rows.map((item) => <tr key={item.id}><td><b>{item.title}</b><small>{item.locale}</small></td><td><code>{item.slug}</code></td><td>{item.publishedAt || "未設置"}</td><td>{item.featured ? <span className="admin-status admin-status--gold">重點推薦</span> : <span className="admin-status admin-status--ok">已發佈</span>}</td><td><div className="admin-row-actions"><button className="admin-row-action" onClick={() => onEdit(item.id)}>查看/編輯 <ChevronRight size={15} /></button><button className="admin-delete-action" onClick={() => onDelete(item)}><Trash2 size={15} />刪除</button></div></td></tr>)}</Table>
    {rows.length === 0 ? <Empty icon={<FileText />} title={query ? "沒有符合條件的消息" : "還沒有可管理的消息"} action={query ? undefined : onCreate} /> : null}
  </Panel>;
}

const universeTypeLabels: Record<UniverseContentType, string> = { "original-video": "AI 原創影片", tutorial: "AI 教學影片", inspiration: "創作靈感" };

function UniverseContentPanel({ content, onCreate, onEdit, onDelete, siteOnly = false }: { siteOnly?: boolean; content: ContentSummary[]; onCreate: (type: UniverseContentType) => void; onEdit: (id: string) => void; onDelete: (item: ContentSummary) => void }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<UniverseContentType>(siteOnly ? "tutorial" : "original-video");
  const rows = content.filter((item) => item.type === type && !item.archived).filter((item) => `${item.title}${item.slug}${item.publishedAt ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  return <Panel title="AI宇宙內容" eyebrow="AI UNIVERSE CONTENT CRUD" action={<><select value={type} onChange={(event) => setType(event.target.value as UniverseContentType)}>{Object.entries(universeTypeLabels).filter(([value]) => !siteOnly || value !== "original-video").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input className="admin-search" placeholder="查詢標題、標識或日期…" value={query} onChange={(event) => setQuery(event.target.value)} /><button className="admin-primary" onClick={() => onCreate(type)}><Plus size={17} />新增內容</button></>}>
    <p className="admin-panel-note">管理 AI 原創影片、AI 教學影片和創作靈感的標題、封面、視頻、簡介、發佈日期和展示狀態。AI 提示詞保持獨立管理，不在此處修改。</p>
    <Table headers={["內容", "類型", "唯一標識", "發佈日期", "狀態", "操作"]}>{rows.map((item) => <tr key={item.id}><td><b>{item.title}</b><small>{item.locale}</small></td><td><span className="admin-status admin-status--gold">{universeTypeLabels[item.type as UniverseContentType]}</span></td><td><code>{item.slug}</code></td><td>{item.publishedAt || "未設置"}</td><td>{item.featured ? <span className="admin-status admin-status--gold">重點推薦</span> : <span className="admin-status admin-status--ok">已保存</span>}</td><td><div className="admin-row-actions"><button className="admin-row-action" onClick={() => onEdit(item.id)}>查看/編輯 <ChevronRight size={15} /></button><button className="admin-delete-action" onClick={() => onDelete(item)}><Trash2 size={17} />刪除</button></div></td></tr>)}</Table>
    {rows.length === 0 ? <Empty icon={<CircleGauge />} title={query ? "沒有符合條件的內容" : `還沒有${universeTypeLabels[type]}`} action={query ? undefined : () => onCreate(type)} /> : null}
  </Panel>;
}

function UniverseContentEditor({ api, site, media, existingSlugs, value, initialType = "original-video", onClose, onSaved, flash, siteOnly = false }: { siteOnly?: boolean; api: Api; site: Site; media: Media[]; existingSlugs: string[]; value?: ContentDraft; initialType?: UniverseContentType; onClose: () => void; onSaved: () => void; flash: Flash }) {
  const data = value?.data ?? {};
  const [form, setForm] = useState({ type: (value?.type as UniverseContentType | undefined) ?? initialType, slug: value?.slug ?? nextAvailableContentSlug("new-universe-content", existingSlugs), locale: value?.locale ?? site.locale, title: value?.title ?? "新 AI 宇宙內容", summary: value?.summary ?? "", coverMediaId: value?.coverMediaId ?? "", videoMediaId: String(data.videoMediaId ?? ""), contentLabel: String(data.contentLabel ?? universeTypeLabels[initialType]), duration: String(data.duration ?? "完整內容"), views: String(data.views ?? "待統計"), publishedAt: String(data.publishedAt ?? ""), href: String(data.href ?? ""), body: String(data.body ?? ""), visible: data.visible !== false, featured: value?.featured ?? false, sortWeight: value?.sortWeight ?? 0 });
  const images = media.filter((item) => item.type === "IMAGE");
  const videos = media.filter((item) => item.type === "VIDEO");
  const selectedCover = images.find((item) => item.id === form.coverMediaId);
  const selectedVideo = videos.find((item) => item.id === form.videoMediaId);
  const save = async () => {
    try {
      const body = { ...(value ? { lockVersion: value.lockVersion } : { type: form.type, slug: form.slug, locale: form.locale }), title: form.title, summary: form.summary, coverMediaId: form.coverMediaId || null, data: { contentLabel: form.contentLabel || universeTypeLabels[form.type], videoMediaId: form.videoMediaId || null, duration: form.duration, views: form.views, publishedAt: form.publishedAt, href: form.href || (form.type === "original-video" ? `/universe/videos/${form.slug}` : `/universe?category=${form.type}`), body: form.body, visible: form.visible }, featured: form.featured, sortWeight: Number(form.sortWeight), relations: [], changeNote: `更新${universeTypeLabels[form.type]}` };
      await api(value ? `/admin-api/v1/content/${value.id}` : `/admin-api/v1/sites/${site.id}/content`, { method: value ? "PUT" : "POST", body: JSON.stringify(body) }, true);
      await publishLatestDraft(api, site.id, `更新${universeTypeLabels[form.type]}`);
      flash("AI 宇宙內容已保存並更新官網"); onSaved();
    } catch (error) { flash(message(error), "error"); }
  };
  return <Drawer title={value ? `管理${universeTypeLabels[form.type]}：${value.title}` : `新增${universeTypeLabels[form.type]}`} subtitle="AI UNIVERSE CONTENT EDITOR" onClose={onClose} action={<button className="admin-primary" onClick={save}><Save size={17} />保存並更新官網</button>}>
    <div className="admin-lock-note"><CircleGauge size={18} /><div><b>AI 宇宙內容管理</b><p>視頻、圖片和文字都從媒體庫或表單管理，保存後直接顯示在對應分類。</p></div></div>
    <div className="admin-form-grid">
      <label>內容分類<select value={form.type} disabled={Boolean(value)} onChange={(event) => { const next = event.target.value as UniverseContentType; setForm((current) => ({ ...current, type: next, contentLabel: universeTypeLabels[next] })); }}>{Object.entries(universeTypeLabels).filter(([type]) => !siteOnly || type !== "original-video").map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select></label>
      <label>內容名稱<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
      <label>內容標籤<input value={form.contentLabel} onChange={(event) => setForm({ ...form, contentLabel: event.target.value })} /></label>
      <label className="admin-span-2">內容簡介<textarea rows={3} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></label>
      <label>選擇封面照片（可選）<select value={form.coverMediaId} onChange={(event) => setForm({ ...form, coverMediaId: event.target.value })}><option value="">不設置封面</option>{images.map((item) => <option key={item.id} value={item.id}>{mediaLabel(item)}</option>)}</select></label>
      <label>選擇視頻素材<select value={form.videoMediaId} onChange={(event) => setForm({ ...form, videoMediaId: event.target.value })}><option value="">無視頻（文章/靈感內容）</option>{videos.map((item) => <option key={item.id} value={item.id}>{mediaLabel(item)}</option>)}</select></label>
      <label>視頻時長<input value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} placeholder="00:15 或 完整內容" /></label>
      <label>觀看數/閱讀數<input value={form.views} onChange={(event) => setForm({ ...form, views: event.target.value })} /></label>
      <label>發佈日期<input value={form.publishedAt} onChange={(event) => setForm({ ...form, publishedAt: event.target.value })} placeholder="2026/08/24" /></label>
      <label>卡片點擊鏈接<input value={form.href} onChange={(event) => setForm({ ...form, href: event.target.value })} placeholder="/universe/videos/slug" /></label>
      <label className="admin-span-2">正文/教學內容<textarea rows={5} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="教學步驟、創作靈感或補充內容，可換行填寫。" /></label>
      <label>排序數值（越大越靠前）<input type="number" value={form.sortWeight} onChange={(event) => setForm({ ...form, sortWeight: Number(event.target.value) })} /></label>
    </div>
    <div className="admin-universe-cover-preview">{selectedCover ? <img src={selectedCover.url} alt={`${form.title}封面預覽`} /> : selectedVideo ? <video src={selectedVideo.url} muted playsInline preload="metadata" aria-label={`${form.title}視頻首幀預覽`} /> : <div><ImageIcon size={28} /><span>未設置封面（可選）</span></div>}<p>{selectedCover ? `已選擇：${selectedCover.displayName || selectedCover.originalName}` : selectedVideo ? "未設置封面，將使用視頻首幀" : "未設置封面"}</p></div>
    <div className="admin-toggle-grid"><label className="admin-checkbox"><input type="checkbox" checked={form.visible} onChange={(event) => setForm({ ...form, visible: event.target.checked })} />上架展示</label><label className="admin-checkbox"><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} />重點推薦</label></div>
  </Drawer>;
}

function NavigationPanel({ site, identities, api, onSaved, flash }: { site: Site; identities: Identity[]; api: Api; onSaved: () => void; flash: Flash }) {
  const [selected, setSelected] = useState(identities[0]?.id ?? "");
  const [draft, setDraft] = useState<NavDraft | null>(null);
  useEffect(() => { const id = selected || identities[0]?.id; if (id) void api<NavDraft>(`/admin-api/v1/navigations/${id}`).then(setDraft); }, [api, identities, selected]);
  const update = (index: number, patch: Partial<NavItem>) => setDraft((current) => current ? { ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) } : current);
  const save = async () => {
    if (!draft) return;
    try { await api(`/admin-api/v1/navigations/${draft.id}`, { method: "PUT", body: JSON.stringify({ lockVersion: draft.lockVersion, items: draft.items.map((item, index) => ({ ...item, order: index })), changeNote: "後台可視化編輯" }) }, true); await publishLatestDraft(api, site.id, "更新官網導航"); flash("導航已保存並更新官網"); onSaved(); } catch (error) { flash(message(error), "error"); }
  };
  return <Panel title="導航欄" eyebrow="SITE NAVIGATION" action={<><select value={selected || identities[0]?.id} onChange={(event) => setSelected(event.target.value)}>{identities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="admin-primary" onClick={save}><Save size={17} />保存導航</button></>}>
    <div className="admin-nav-editor">{draft?.items.map((item, index) => <div className="admin-nav-item" key={item.id ?? index}><span className="admin-drag">{String(index + 1).padStart(2, "0")}</span><label>名稱<input value={item.label} onChange={(event) => update(index, { label: event.target.value })} /></label><label>鏈接<input value={item.linkValue} onChange={(event) => update(index, { linkValue: event.target.value })} /></label><label>打開方式<select value={item.target} onChange={(event) => update(index, { target: event.target.value })}><option value="_self">當前頁面</option><option value="_blank">新窗口</option></select></label><button type="button" className="admin-icon-button" onClick={() => setDraft({ ...draft, items: draft.items.filter((_, itemIndex) => itemIndex !== index) })} aria-label="刪除"><Trash2 size={16} /></button></div>)}<button className="admin-add-row" onClick={() => draft && setDraft({ ...draft, items: [...draft.items, { label: "新導航", linkType: "INTERNAL", linkValue: "/", target: "_self", order: draft.items.length, visible: true }] })}><Plus size={16} />添加導航項</button></div>
  </Panel>;
}

function FooterPanel({ site, media, api, onSaved, flash }: { site: Site; media: Media[]; api: Api; onSaved: () => void; flash: Flash }) {
  const [config, setConfig] = useState<JsonDraft | null>(null);
  const [settings, setSettings] = useState<FooterSettings>({ ...defaultFooterSettings });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    void api<JsonDraft>(`/admin-api/v1/sites/${site.id}/config`)
      .then((value) => { const resolved = resolveFooterSettings(value.value.footer); const selected = media.find((item) => item.id === resolved.backgroundMediaId); setConfig(value); setSettings(selected ? { ...resolved, backgroundUrl: selected.url } : resolved); setDirty(false); })
      .catch((error) => setLoadError(message(error)));
  }, [api, media, site.id]);

  const patch = <K extends keyof FooterSettings>(key: K, value: FooterSettings[K]) => { setSettings((current) => ({ ...current, [key]: value })); setDirty(true); };
  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const saved = await api<JsonDraft>(`/admin-api/v1/sites/${site.id}/config`, {
        method: "PUT",
        body: JSON.stringify({ lockVersion: config.lockVersion, value: { ...config.value, footer: { ...settings, backgroundUrl: settings.backgroundMediaId ? "" : settings.backgroundUrl } }, changeNote: "後台底部欄編輯" }),
      }, true);
      setConfig(saved);
      await publishLatestDraft(api, site.id, "更新官網底部欄");
      await verifyPublishedFooterCopyright(api, site.key, settings.copyright);
      setDirty(false);
      onSaved();
      flash("底部欄已保存並更新全站");
    } catch (error) { flash(message(error), "error"); }
    finally { setSaving(false); }
  };
  const imageMedia = media.filter((item) => item.type === "IMAGE");

  return <div className="admin-footer-studio">
    <aside className="admin-live-preview admin-footer-preview">
      <header><div><p className="admin-kicker">LIVE PREVIEW</p><h3>底部欄實時預覽</h3></div><span><i />未保存預覽</span></header>
      <p>在右側修改時，左側會立即顯示全站底部欄的真實效果。</p>
      <div className="admin-footer-preview__viewport"><div className="admin-footer-preview__canvas"><Footer settings={settings} /></div></div>
    </aside>

    <Panel title="編輯底部欄" eyebrow="GLOBAL FOOTER" action={<button className="admin-primary" type="button" onClick={save} disabled={!config || saving}><Save size={17} />{saving ? "正在更新官網…" : "保存並更新官網"}</button>}>
      <div className="admin-footer-controls">
      {loadError ? <p className="admin-form-error">底部欄配置加載失敗：{loadError}</p> : null}
      <div className="admin-lock-note"><ShieldCheck size={18} /><div><b>底部欄佈局已鎖定</b><p>可調整全部文字、背景圖、顏色和字號，保存後所有前台頁面同步更新。</p></div></div>

      <h3 className="admin-field-group-title">品牌區域</h3>
      <div className="admin-form-grid">
        <label className="admin-span-2">主標題（換行會保留）<textarea rows={3} value={settings.brandTitle} onChange={(event) => patch("brandTitle", event.target.value)} /></label>
        <label>英文說明<input value={settings.brandSubtitle} onChange={(event) => patch("brandSubtitle", event.target.value)} /></label>
        <label>主標題字號（px）<input type="number" min="16" max="48" value={settings.brandTitleSize} onChange={(event) => patch("brandTitleSize", Number(event.target.value))} /></label>
        <label>按鈕文字<input value={settings.ctaLabel} onChange={(event) => patch("ctaLabel", event.target.value)} /></label>
        <label>按鈕鏈接<input value={settings.ctaHref} onChange={(event) => patch("ctaHref", event.target.value)} /></label>
      </div>

      <h3 className="admin-field-group-title">聯絡信息</h3>
      <div className="admin-form-grid">
        <label>欄目標題<input value={settings.contactTitle} onChange={(event) => patch("contactTitle", event.target.value)} /></label>
        <label>英文標題<input value={settings.contactSubtitle} onChange={(event) => patch("contactSubtitle", event.target.value)} /></label>
        <label>郵箱<input type="email" value={settings.email} onChange={(event) => patch("email", event.target.value)} /></label>
        <label>電話<input value={settings.phone} onChange={(event) => patch("phone", event.target.value)} /></label>
        <label className="admin-span-2">傳真<input value={settings.fax} onChange={(event) => patch("fax", event.target.value)} /></label>
      </div>

      <h3 className="admin-field-group-title">公司信息</h3>
      <div className="admin-form-grid">
        <label>欄目標題<input value={settings.companyTitle} onChange={(event) => patch("companyTitle", event.target.value)} /></label>
        <label>英文標題<input value={settings.companySubtitle} onChange={(event) => patch("companySubtitle", event.target.value)} /></label>
        <label className="admin-span-2">地址<input value={settings.address} onChange={(event) => patch("address", event.target.value)} /></label>
        <label>統一編號<input value={settings.companyNumber} onChange={(event) => patch("companyNumber", event.target.value)} /></label>
        <label>服務時間<input value={settings.serviceHours} onChange={(event) => patch("serviceHours", event.target.value)} /></label>
        <label className="admin-span-2">版權文字<input value={settings.copyright} onChange={(event) => patch("copyright", event.target.value)} /></label>
      </div>
      <div className="admin-footer-inline-save">
        <p>{dirty ? "當前修改只在左側預覽，保存後才會發佈到前台。" : "當前底部欄已保存。"}</p>
        <button className="admin-primary" type="button" onClick={save} disabled={!config || saving || !dirty}><Save size={17} />{saving ? "正在更新官網…" : "保存並更新官網"}</button>
      </div>

      <h3 className="admin-field-group-title">背景與格式</h3>
      <div className="admin-form-grid">
        <label>背景圖片<select value={settings.backgroundMediaId} onChange={(event) => { const selected = imageMedia.find((item) => item.id === event.target.value); patch("backgroundMediaId", event.target.value); if (selected) patch("backgroundUrl", selected.url); }}><option value="">當前數據庫資源</option>{imageMedia.map((item) => <option key={item.id} value={item.id}>{mediaLabel(item)}</option>)}</select></label>
        <label>背景位置<select value={settings.backgroundPosition} onChange={(event) => patch("backgroundPosition", event.target.value)}><option value="center center">居中</option><option value="center top">頂部居中</option><option value="center bottom">底部居中</option><option value="left center">左側居中</option><option value="right center">右側居中</option><option value="center 54%">當前位置</option></select></label>
        <label>欄目標題字號（px）<input type="number" min="13" max="32" value={settings.sectionTitleSize} onChange={(event) => patch("sectionTitleSize", Number(event.target.value))} /></label>
        <label>信息文字字號（px）<input type="number" min="9" max="20" value={settings.detailTextSize} onChange={(event) => patch("detailTextSize", Number(event.target.value))} /></label>
      </div>
      <div className="admin-color-grid admin-footer-colors">
        <label><span><i style={{ background: settings.backgroundColor }} />背景顏色</span><input type="color" value={settings.backgroundColor} onChange={(event) => patch("backgroundColor", event.target.value)} /></label>
        <label><span><i style={{ background: settings.titleColor }} />標題顏色</span><input type="color" value={settings.titleColor} onChange={(event) => patch("titleColor", event.target.value)} /></label>
        <label><span><i style={{ background: settings.textColor }} />信息顏色</span><input type="color" value={settings.textColor} onChange={(event) => patch("textColor", event.target.value)} /></label>
        <label><span><i style={{ background: settings.mutedColor }} />次要文字</span><input type="color" value={settings.mutedColor} onChange={(event) => patch("mutedColor", event.target.value)} /></label>
        <label><span><i style={{ background: settings.accentColor }} />強調顏色</span><input type="color" value={settings.accentColor} onChange={(event) => patch("accentColor", event.target.value)} /></label>
      </div>
      </div>
    </Panel>
  </div>;
}

function AppearancePanel({ site, themes, fonts, media, api, onSaved, flash }: { site: Site; themes: Identity[]; fonts: Font[]; media: Media[]; api: Api; onSaved: () => void; flash: Flash }) {
  const [theme, setTheme] = useState<JsonDraft | null>(null);
  const [config, setConfig] = useState<JsonDraft | null>(null);
  const [fontName, setFontName] = useState("");
  useEffect(() => { void api<JsonDraft>(`/admin-api/v1/sites/${site.id}/config`).then(setConfig); const id = themes[0]?.id; if (id) void api<JsonDraft>(`/admin-api/v1/themes/${id}`).then(setTheme); }, [api, site.id, themes]);
  const colors = (theme?.value.colors ?? {}) as Json;
  const themeFonts = (theme?.value.fonts ?? {}) as Json;
  const radius = (theme?.value.radius ?? {}) as Json;
  const defaultSeo = (config?.value.defaultSeo ?? {}) as Json;
  const updateThemeGroup = (group: string, key: string, value: string | number) => setTheme((current) => current ? { ...current, value: { ...current.value, [group]: { ...((current.value[group] ?? {}) as Json), [key]: value } } } : current);
  const updateColor = (key: string, value: string) => updateThemeGroup("colors", key, value);
  const updateConfig = (key: string, value: string) => setConfig((current) => current ? { ...current, value: { ...current.value, [key]: value } } : current);
  const updateSeo = (key: string, value: string) => setConfig((current) => current ? { ...current, value: { ...current.value, defaultSeo: { ...((current.value.defaultSeo ?? {}) as Json), [key]: value } } } : current);
  const save = async () => { try { if (theme) await api(`/admin-api/v1/themes/${theme.id}`, { method: "PUT", body: JSON.stringify({ lockVersion: theme.lockVersion, value: theme.value, changeNote: "後台外觀編輯" }) }, true); if (config) await api(`/admin-api/v1/sites/${site.id}/config`, { method: "PUT", body: JSON.stringify({ lockVersion: config.lockVersion, value: config.value, changeNote: "後台站點編輯" }) }, true); await publishLatestDraft(api, site.id, "更新官網外觀與站點設置"); flash("外觀設置已保存並更新官網"); onSaved(); } catch (error) { flash(message(error), "error"); } };
  const createFont = async () => { if (!fontName.trim()) return; try { await api(`/admin-api/v1/sites/${site.id}/fonts`, { method: "POST", body: JSON.stringify({ name: fontName, fallbackStack: `\"${fontName}\", Arial, sans-serif` }) }, true); setFontName(""); flash("字體族已創建"); onSaved(); } catch (error) { flash(message(error), "error"); } };
  return <div className="admin-stack"><Panel title="全站外觀" eyebrow="VISUAL SETTINGS" action={<button className="admin-primary" onClick={save}><Save size={17} />保存設置</button>}><p className="admin-panel-note">這些設置只改變全站顏色、字體和圓角，不改變任何頁面佈局。</p><div className="admin-color-grid">{[["background","頁面背景"],["surface","卡片背景"],["text","主要文字"],["muted","次要文字"],["accent","品牌金色"],["cyan","品牌藍色"]].map(([key,label]) => <label key={key}><span><i style={{ background: String(colors[key] ?? "#000000") }} />{label}</span><input type="color" value={String(colors[key] ?? "#000000")} onChange={(event) => updateColor(key, event.target.value)} /></label>)}</div><div className="admin-form-grid admin-settings-grid"><label>標題字體<input value={String(themeFonts.heading ?? "Arial, sans-serif")} onChange={(event) => updateThemeGroup("fonts", "heading", event.target.value)} /></label><label>正文字體<input value={String(themeFonts.body ?? "Arial, sans-serif")} onChange={(event) => updateThemeGroup("fonts", "body", event.target.value)} /></label><label>卡片圓角（px）<input type="number" min="0" max="40" value={Number(radius.card ?? 12)} onChange={(event) => updateThemeGroup("radius", "card", Number(event.target.value))} /></label><label>按鈕圓角（px）<input type="number" min="0" max="40" value={Number(radius.button ?? 8)} onChange={(event) => updateThemeGroup("radius", "button", Number(event.target.value))} /></label><label>站點名稱<input value={String(config?.value.name ?? "MY DREAM")} onChange={(event) => updateConfig("name", event.target.value)} /></label><label>默認語言<input value={String(config?.value.locale ?? "zh-Hant")} onChange={(event) => updateConfig("locale", event.target.value)} /></label><label>搜索標題<input value={String(defaultSeo.title ?? "")} onChange={(event) => updateSeo("title", event.target.value)} /></label><label>搜索描述<input value={String(defaultSeo.description ?? "")} onChange={(event) => updateSeo("description", event.target.value)} /></label></div></Panel><Panel title="字體文件" eyebrow="TYPOGRAPHY" action={<div className="admin-inline-form"><input placeholder="新字體名稱" value={fontName} onChange={(event) => setFontName(event.target.value)} /><button className="admin-secondary" onClick={createFont}><Plus size={16} />創建字體族</button></div>}><div className="admin-font-grid">{fonts.map((font) => <div className="admin-font-card" key={font.id}><span>Aa</span><div><b>{font.name}</b><small>{font.fallbackStack}</small><p>{font.faces.length} 個字體文件</p></div></div>)}{fonts.length === 0 ? <p className="admin-muted">先在圖片和媒體庫上傳 WOFF/WOFF2，再創建字體族並關聯字體文件。當前有 {media.filter((item) => item.type === "FONT").length} 個字體媒體。</p> : null}</div></Panel></div>;
}

function MediaPanel({ site, media, api, onSaved, flash }: { site: Site; media: Media[]; api: Api; onSaved: () => void; flash: Flash }) {
  const [uploading, setUploading] = useState(false);
  const [assetName, setAssetName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const upload = async () => { if (!selectedFile || !assetName.trim()) return; setUploading(true); try { const body = new FormData(); body.set("file", selectedFile); body.set("name", assetName.trim()); body.set("altText", assetName.trim()); await api(`/admin-api/v1/sites/${site.id}/media`, { method: "POST", body }, true); setAssetName(""); setSelectedFile(null); flash("素材上傳完成"); onSaved(); } catch (error) { flash(message(error), "error"); } finally { setUploading(false); } };
  const archive = async (id: string) => { if (!window.confirm("確認歸檔這個媒體文件？")) return; try { await api(`/admin-api/v1/media/${id}`, { method: "DELETE" }, true); flash("媒體已歸檔"); onSaved(); } catch (error) { flash(message(error), "error"); } };
  return <Panel title="圖片和媒體庫" eyebrow="IMAGE & MEDIA LIBRARY" action={<div className="admin-media-upload-form"><input aria-label="素材名稱" placeholder="輸入素材名稱" value={assetName} onChange={(event) => setAssetName(event.target.value)} /><label className="admin-secondary admin-upload"><ImageIcon size={16} />{selectedFile?.name ?? "選擇文件"}<input type="file" accept="image/*,video/*,audio/*,.woff,.woff2,.pdf" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} disabled={uploading} /></label><button className="admin-primary" type="button" onClick={() => void upload()} disabled={uploading || !selectedFile || !assetName.trim()}><Upload size={17} />{uploading ? "上傳中…" : "上傳素材"}</button></div>}><p className="admin-panel-note">上傳前先填寫易識別的素材名稱。頁面背景、作品封面和底部背景引用時，會在下拉框中顯示這個名稱。</p><div className="admin-media-grid">{media.map((item) => <article key={item.id}><div className="admin-media-thumb">{item.type === "IMAGE" ? <img src={item.url} alt={item.altText ?? item.displayName ?? item.originalName} /> : <span><ImageIcon size={28} /><small>{item.type}</small></span>}<button onClick={() => archive(item.id)} aria-label="歸檔媒體"><Trash2 size={15} /></button></div><b>{item.displayName || item.originalName}</b><small>原文件：{item.originalName}</small><small>{formatBytes(item.size)} · {item.mimeType}</small></article>)}</div>{media.length === 0 ? <Empty icon={<ImageIcon />} title="圖片和媒體庫是空的" /> : null}</Panel>;
}

function FormsPanel({ site, submissions, api, onSaved, flash }: { site: Site; submissions: Submission[]; api: Api; onSaved: () => void; flash: Flash }) {
  const [settings, setSettings] = useState<FormNotificationSettings | null>(null);
  useEffect(() => { void api<FormNotificationSettings>(`/admin-api/v1/sites/${site.id}/forms/business-contact/notification`).then(setSettings).catch((error) => flash(message(error), "error")); }, [api, flash, site.id]);
  const update = async (id: string, status: string) => { try { await api(`/admin-api/v1/submissions/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }, true); flash("線索狀態已更新"); onSaved(); } catch (error) { flash(message(error), "error"); } };
  const saveSettings = async () => {
    if (!settings) return;
    try {
      const saved = await api<FormNotificationSettings>(`/admin-api/v1/sites/${site.id}/forms/business-contact/notification`, { method: "PUT", body: JSON.stringify({ recipientEmail: settings.recipientEmail, enabled: settings.enabled, lockVersion: settings.lockVersion }) }, true);
      setSettings(saved); flash("表單郵件通知設置已保存");
    } catch (error) { flash(message(error), "error"); }
  };
  const emailLabel = (status: string) => ({ SENT: "已發送", FAILED: "發送失敗", QUEUED: "發送中", NOT_CONFIGURED: "未配置" }[status] ?? status);
  return <div className="admin-stack"><Panel title="表單郵件通知" eyebrow="EMAIL DELIVERY" action={<button className="admin-primary" type="button" onClick={() => void saveSettings()} disabled={!settings}><Save size={16} />保存郵件設置</button>}>
    <p className="admin-panel-note">訪客提交後會先加密保存到數據庫，再發送到指定郵箱。SMTP 密碼只通過服務器環境變量配置，不會保存到後台或數據庫。</p>
    {settings ? <div className="admin-form-grid admin-settings-grid"><label>接收聯繫信息的郵箱<input type="email" value={settings.recipientEmail} placeholder="例如 contact@mydream.com" onChange={(event) => setSettings({ ...settings, recipientEmail: event.target.value })} /></label><label className="admin-checkbox"><input type="checkbox" checked={settings.enabled} onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })} />啟用郵件通知</label><div className="admin-span-2"><span className={`admin-status ${settings.smtpConfigured ? "admin-status--ok" : ""}`}>{settings.smtpConfigured ? "SMTP 已配置" : "SMTP 尚未配置"}</span></div></div> : <div className="admin-empty">正在讀取郵件設置…</div>}
  </Panel><Panel title="表單線索" eyebrow="FORM INTAKE"><Table headers={["聯繫人", "聯繫信息", "需求", "提交時間", "郵件", "狀態"]}>{submissions.map((item) => <tr key={item.id}><td><b>{String(item.payload.name ?? "未填寫")}</b><small>{String(item.payload.company ?? item.formKey)}</small></td><td><b>{String(item.payload.email ?? "—")}</b><small>{String(item.payload.phone ?? "—")}</small></td><td className="admin-cell-wrap">{Array.isArray(item.payload.cooperationNeeds) ? item.payload.cooperationNeeds.join("、") : String(item.payload.message ?? "—")}</td><td>{formatDate(item.createdAt)}</td><td><span className={`admin-status ${item.emailStatus === "SENT" ? "admin-status--ok" : item.emailStatus === "FAILED" ? "admin-toast--error" : ""}`} title={item.emailError}>{emailLabel(item.emailStatus)}</span><small>{item.emailRecipient ?? ""}</small></td><td><select value={item.status} onChange={(event) => update(item.id, event.target.value)}><option value="NEW">新線索</option><option value="IN_PROGRESS">跟進中</option><option value="DONE">已完成</option><option value="SPAM">垃圾信息</option></select></td></tr>)}</Table>{submissions.length === 0 ? <Empty icon={<FileText />} title="暫無表單提交" /> : null}</Panel></div>;
}

function UsersPanel({ site, users, api, onSaved, flash }: { site: Site; users: User[]; api: Api; onSaved: () => void; flash: Flash }) {
  const [form, setForm] = useState({ email: "", password: "", displayName: "", role: "EDITOR" });
  const create = async (event: FormEvent) => { event.preventDefault(); try { await api("/admin-api/v1/users", { method: "POST", body: JSON.stringify({ ...form, siteId: site.id }) }, true); setForm({ email: "", password: "", displayName: "", role: "EDITOR" }); flash("管理員已創建"); onSaved(); } catch (error) { flash(message(error), "error"); } };
  return <div className="admin-two-column admin-two-column--users"><Panel title="管理員賬號" eyebrow="ACCESS CONTROL"><div className="admin-list">{users.map((user) => <div className="admin-list-row" key={user.id}><span className="admin-avatar">{user.displayName.slice(0, 1)}</span><div><b>{user.displayName}</b><small>{user.email}</small></div><span className="admin-status">{user.roles.join(" / ")}</span></div>)}</div></Panel><Panel title="添加管理員" eyebrow="NEW ACCOUNT"><form className="admin-form" onSubmit={create}><label>顯示名稱<input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} required /></label><label>郵箱<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label><label>初始密碼<input type="password" minLength={12} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label><label>角色<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="SITE_ADMIN">站點管理員</option><option value="EDITOR">內容編輯</option><option value="REVIEWER">審核發佈</option><option value="MEDIA_EDITOR">媒體編輯</option></select></label><button className="admin-primary admin-primary--wide" type="submit"><Plus size={17} />創建管理員</button></form></Panel></div>;
}

function ReleasesPanel({ releases, api, onSaved, flash }: { releases: Release[]; api: Api; onSaved: () => void; flash: Flash }) {
  const activate = async (id: string) => { if (!window.confirm("確認切換到這個歷史發佈版本？")) return; try { await api(`/admin-api/v1/releases/${id}/activate`, { method: "POST" }, true); flash("線上版本已切換"); onSaved(); } catch (error) { flash(message(error), "error"); } };
  return <Panel title="版本記錄" eyebrow="AUTOMATIC HISTORY"><p className="admin-panel-note">不需要手動發佈。每次保存都會直接更新官網，這裡只用於查看或恢復歷史版本。</p><div className="admin-release-list">{releases.map((release) => <article key={release.id} className={release.active ? "is-active" : ""}><div className="admin-release-number"><small>VERSION</small><strong>R{release.releaseNo}</strong></div><div><b>{release.active ? "當前官網版本" : "歷史版本"}</b><p>{release.changeNote ?? "自動保存記錄"}</p><small>{formatDate(release.publishedAt)}</small></div>{release.active ? <span className="admin-status admin-status--ok">LIVE</span> : <button className="admin-secondary" onClick={() => activate(release.id)}>恢復此版本</button>}</article>)}</div></Panel>;
}

type Api = <T>(path: string, options?: RequestInit, csrf?: boolean) => Promise<T>;
type Flash = (message: string, tone?: "ok" | "error") => void;

function PageEditor({ api, site, page, media, onClose, onSaved, flash }: { api: Api; site: Site; page: PageDraft; media: Media[]; onClose: () => void; onSaved: () => void; flash: Flash }) {
  const seo = page.seo as { title?: string; description?: string };
  const [form, setForm] = useState(() => ({ title: page.title, seoTitle: seo.title ?? page.title, seoDescription: seo.description ?? "", blocks: ensureHomeSectionBlocks(page.path, page.blocks).map((block) => {
    const props = { ...block.props };
    for (const [field, id] of Object.entries(props)) {
      if (!field.endsWith("MediaId") || !id) continue;
      const asset = media.find(item => item.id === id);
      if (asset) props[field.replace(/MediaId$/, "Url")] = asset.url;
    }
    return { ...block, props };
  }) }));
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const patchBlock = (index: number, key: "props" | "style", field: string, value: string | number | boolean) => setForm((current) => ({ ...current, blocks: current.blocks.map((block, blockIndex) => blockIndex === index ? { ...block, [key]: { ...block[key], [field]: value } } : block) }));
  const save = async () => { setSaving(true); try { const blocks = form.blocks.map((block) => { const props = { ...block.props }; Object.keys(props).filter((field) => field.endsWith("MediaId") && props[field]).forEach((field) => { delete props[field.replace(/MediaId$/, "Url")]; }); return { ...block, props }; }); await api(`/admin-api/v1/pages/${page.id}`, { method: "PUT", body: JSON.stringify({ lockVersion: page.lockVersion, title: form.title, seo: { ...seo, title: form.seoTitle, description: form.seoDescription }, blocks, changeNote: "固定頁面文字與樣式微調" }) }, true); await publishLatestDraft(api, site.id, `更新官網頁面：${page.title}`); flash("頁面已保存並更新官網"); onSaved(); } catch (error) { flash(message(error), "error"); } finally { setSaving(false); } };
  const editableBlocks = form.blocks.map((block, index) => ({ block, index })).filter(({ block }) => block.type !== "spacer" && !(page.path === "/universe" && block.zone === "quicklinks") && !(page.path === "/about" && block.zone === "banner"));
  const selected = editableBlocks[activeBlockIndex] ?? editableBlocks[0];
  const previewPage: CmsPage = {
    id: page.id,
    path: page.path,
    key: page.pageKey,
    locale: page.locale,
    title: form.title,
    seo: { ...seo, title: form.seoTitle, description: form.seoDescription },
    blocks: form.blocks.filter((block) => block.visible).map((block, index) => ({ ...block, id: block.id ?? `preview-${block.type}-${index}` })),
  };
  return <Drawer title={`微調：${page.title}`} subtitle="FIXED LAYOUT TUNING" onClose={onClose} action={<button className="admin-primary" onClick={save} disabled={saving}><Save size={17} />{saving ? "正在更新官網…" : "保存並更新官網"}</button>}>
    <div className="admin-lock-note"><ShieldCheck size={18} /><div><b>頁面按前台區塊獨立管理</b><p>選擇下面任一區塊，單獨設置該區域的文字、背景圖和展示格式；頁面佈局順序保持不變。</p></div></div>
    <div className="admin-form-grid"><label>後台頁面名稱<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>訪問地址<input value={page.path} disabled /></label><label>瀏覽器標題<input value={form.seoTitle} onChange={(event) => setForm({ ...form, seoTitle: event.target.value })} /></label><label>搜索摘要<input value={form.seoDescription} onChange={(event) => setForm({ ...form, seoDescription: event.target.value })} /></label></div>
    <div className="admin-visual-editor">
      <PageLivePreview page={previewPage} activeBlock={selected?.block} />
      <div className="admin-visual-editor__controls"><div className="admin-section-tiles">{editableBlocks.map(({ block }, tileIndex) => {
        const info = blockInfo(block.type, block.zone);
        const image = String(block.props.backgroundUrl ?? "");
        return <button type="button" className={`admin-section-tile ${activeBlockIndex === tileIndex ? "is-active" : ""}`} onClick={() => setActiveBlockIndex(tileIndex)} key={block.id ?? block.type} style={image ? { backgroundImage: `linear-gradient(rgba(3,10,17,.3),rgba(3,10,17,.92)),url(${JSON.stringify(image)})` } : undefined}><small>{String(tileIndex + 1).padStart(2, "0")} · {info.eyebrow}</small><strong>{info.title}</strong><span>{info.hint}</span></button>;
      })}</div>{selected ? <HomeBlockEditor pagePath={page.path} block={selected.block} index={selected.index} media={media} patch={patchBlock} /> : null}</div>
    </div>
  </Drawer>;
}

function PageLivePreview({ page, activeBlock }: { page: CmsPage; activeBlock?: BlockDraft }) {
  if (page.path === "/") return <HomeLivePreview page={page} activeType={activeBlock?.type ?? "hero"} />;
  return <IframeLivePreview page={page} activeZone={activeBlock?.zone} />;
}

function IframeLivePreview({ page, activeZone }: { page: CmsPage; activeZone?: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [frameScale, setFrameScale] = useState(0.5);
  const send = useCallback(() => frameRef.current?.contentWindow?.postMessage({ type: "cms-visual-preview", page, activeZone }, window.location.origin), [activeZone, page]);
  useEffect(() => { send(); }, [send]);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const updateScale = () => setFrameScale(Math.min(1, Math.max(0.35, viewport.clientWidth / 1440)));
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);
  return <aside className="admin-live-preview"><header><div><p className="admin-kicker">LIVE PREVIEW</p><h3>{page.title}實時預覽</h3></div><span><i />未保存預覽</span></header><p>在右側輸入時，這裡會立即顯示真實頁面效果。</p><div className="admin-live-preview__viewport admin-live-preview__viewport--frame" ref={viewportRef}><iframe ref={frameRef} src={page.path === "/video-player" ? "/video-player?preview=1" : page.path === "/episode-player" ? "/episode-player?preview=1" : page.path} title={`${page.title}實時預覽`} onLoad={send} style={{ transform: `scale(${frameScale})`, transformOrigin: "top left" }} /></div></aside>;
}

function HomeLivePreview({ page, activeType }: { page: CmsPage; activeType: string }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = viewportRef.current;
    const target = viewport?.querySelector<HTMLElement>(`[data-cms-section="${activeType}"]`);
    if (!viewport || !target) return;
    const viewportTop = viewport.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top;
    viewport.scrollTo({ top: Math.max(0, viewport.scrollTop + targetTop - viewportTop - 10), behavior: "smooth" });
  }, [activeType]);
  return <aside className="admin-live-preview"><header><div><p className="admin-kicker">LIVE PREVIEW</p><h3>首頁實時預覽</h3></div><span><i />未保存預覽</span></header><p>在右側輸入時，這裡會立即顯示效果。</p><div className="admin-live-preview__viewport" ref={viewportRef}><div className="admin-live-preview__canvas"><JygPrototypeHome page={page} hero={buildJygHomeHeroModel(undefined, page)} previewSection={activeType} /></div></div></aside>;
}

function blockInfo(type: string, zone?: string) {
  if (zone === "page-background") return { eyebrow: "PAGE BACKGROUND", title: "頁面背景", hint: "更換背景圖片與位置" };
  if (zone === "works-library") return { eyebrow: "ALL WORKS", title: "全部作品列表", hint: "標題、介紹與背景圖片" };
  if (zone === "coin-usage") return { eyebrow: "COIN USAGE", title: "金幣使用說明", hint: "金幣充值下方四項說明的背景圖片與位置" };
  if (zone === "consumer-rights") return { eyebrow: "CONSUMER RIGHTS", title: "消費者權益說明", hint: "背景圖片與位置" };
  if (type === "hero") return { eyebrow: "HERO", title: "首屏主視覺", hint: "標題、說明、背景與版式" };
  if (zone === "story") return { eyebrow: "BRAND STORY", title: "品牌故事", hint: "人物視覺、品牌文案與格式" };
  if (zone === "platform") return { eyebrow: "FUTURE PLAN", title: "未來規劃", hint: "IP 周邊共創計畫與五個步驟" };
  if (zone === "join") return { eyebrow: "JOIN MY DREAM", title: "加入平台", hint: "加入文案與展示格式" };
  if (zone === "characters") return { eyebrow: "OUR IP CHARACTERS", title: "原創 IP 角色", hint: "五張角色卡、圖片與說明" };
  if (zone === "banner") return { eyebrow: "BRAND BANNER", title: "品牌橫幅", hint: "口號、背景圖與格式" };
  if (type === "section-heading") return { eyebrow: "FEATURED WORKS", title: "熱門作品", hint: "區塊文案、背景與作品網格" };
  if (type === "category-tabs") return { eyebrow: "CATEGORIES", title: zone === "categories" ? "學習分類" : "分類探索", hint: "分類文案、背景與展示格式" };
  if (type === "pricing-grid") return { eyebrow: "PRICING", title: zone === "membership" ? "會員方案" : "金幣充值", hint: "標題、說明與方案網格" };
  if (type === "contact-form") return { eyebrow: "CONTACT", title: "聯繫表單", hint: "表單標題、說明與背景" };
  if (type === "rich-text") return { eyebrow: "STORY", title: zone === "vision" ? "品牌願景" : "文字內容", hint: "標題、正文、背景與版式" };
  if (type === "feature-cards") return { eyebrow: "FEATURES", title: zone === "capabilities" ? "平台能力" : "功能卡片", hint: "區塊文案與卡片格式" };
  if (type === "content-grid") return { eyebrow: "CONTENT", title: zone === "business" ? "商業佈局" : zone === "news-library" ? "消息列表" : zone === "tutorials" ? "AI 教學影片" : zone === "community" ? "創作者社群" : zone === "quicklinks" ? "創作資源入口" : "內容區域", hint: "區塊文字、背景與網格" };
  return { eyebrow: type.toUpperCase(), title: "頁面區塊", hint: "文字、背景與展示格式" };
}

function HomeBlockEditor({ pagePath, block, index, media, patch }: { pagePath: string; block: BlockDraft; index: number; media: Media[]; patch: (index: number, key: "props" | "style", field: string, value: string | number | boolean) => void }) {
  const info = blockInfo(block.type, block.zone);
  const isHero = block.type === "hero";
  const isFeatured = block.type === "section-heading";
  const isDownloadPlatforms = block.zone === "store-status";
  const isAboutPlatform = block.zone === "platform";
  const isAboutStory = block.zone === "story";
  const isAboutJoin = block.zone === "join";
  const isAboutCharacters = block.zone === "characters";
  const isUniverseCommunity = block.zone === "community";
  const isUniverseQuicklinks = block.zone === "quicklinks";
  const isAboutHero = pagePath === "/about" && isHero;
  const showsSubtitle = isHero || block.zone === "join" || isAboutCharacters;
  const prop = (field: string, fallback = "") => String(block.props[field] ?? fallback);
  const style = (field: string, fallback: string | number) => block.style[field] ?? fallback;
  const numberField = (field: string, fallback: number, min: number, max: number, label: string) => <label>{label}<input type="number" min={min} max={max} step={field === "overlay" ? 0.05 : 1} value={Number(style(field, fallback))} onChange={(event) => patch(index, "style", field, Number(event.target.value))} /></label>;
  const positionControl = (label: string, field: string, fallback: string) => {
    const [x = "center", y = "center"] = prop(field, fallback).trim().split(/\s+/);
    const update = (nextX: string, nextY: string) => patch(index, "props", field, `${nextX} ${nextY}`);
    return <div className="admin-position-control"><span>{label}</span><div><select aria-label={`${label}水平位置`} value={x} onChange={(event) => update(event.target.value, y)}><option value="left">左</option><option value="center">中</option><option value="right">右</option><option value="0%">0%</option><option value="25%">25%</option><option value="50%">50%</option><option value="75%">75%</option><option value="100%">100%</option></select><select aria-label={`${label}垂直位置`} value={y} onChange={(event) => update(x, event.target.value)}><option value="top">上</option><option value="center">中</option><option value="bottom">下</option><option value="0%">0%</option><option value="25%">25%</option><option value="50%">50%</option><option value="75%">75%</option><option value="100%">100%</option></select></div></div>;
  };
  const isConsumerRights = pagePath === "/tasks" && block.zone === "consumer-rights";
  if (pagePath === "/works" && (isHero || block.zone === "works-library")) return <section className="admin-fixed-card admin-fixed-card--editor">
    <header><div><p className="admin-kicker">{info.eyebrow}</p><h3>{isHero ? "全部作品首屏" : info.title}設置</h3></div></header>
    <div className="admin-form-grid">
      <label className="admin-span-2">主標題<textarea rows={2} value={prop("title")} onChange={(event) => patch(index, "props", "title", event.target.value)} /></label>
      {isHero && <label className="admin-span-2">副標題<input value={prop("subtitle")} onChange={event => patch(index, "props", "subtitle", event.target.value)} /></label>}
      <label className="admin-span-2">詳細介紹<textarea rows={3} value={prop("description")} onChange={(event) => patch(index, "props", "description", event.target.value)} /></label>
      {isHero && ["One", "Two", "Three"].map((key, itemIndex) => <div className="admin-form-grid admin-span-2" key={key}><label>特色 {itemIndex + 1} 標題<input value={prop(`feature${key}Title`)} onChange={event => patch(index, "props", `feature${key}Title`, event.target.value)} /></label><label>特色 {itemIndex + 1} 說明<input value={prop(`feature${key}Description`)} onChange={event => patch(index, "props", `feature${key}Description`, event.target.value)} /></label></div>)}
      <label>背景圖片<select value={prop("backgroundMediaId")} onChange={(event) => {
        const selected = media.find((item) => item.id === event.target.value);
        patch(index, "props", "backgroundMediaId", event.target.value);
        patch(index, "props", "backgroundUrl", selected?.url ?? (isHero ? allWorksHeroBackground : ""));
      }}><option value="">預設背景</option>{media.filter((item) => item.type === "IMAGE").map((item) => <option key={item.id} value={item.id}>{mediaLabel(item)}</option>)}</select></label>
      <label>背景圖位置<select value={prop("backgroundPosition", isHero ? "70% center" : "center center")} onChange={(event) => patch(index, "props", "backgroundPosition", event.target.value)}>
        <option value="70% center">預設構圖</option><option value="center center">置中</option><option value="left center">靠左</option><option value="right center">靠右</option><option value="center top">靠上</option><option value="center bottom">靠下</option>
      </select></label>
    </div>
    <p className="admin-panel-note">先在圖片和媒體庫上傳圖片，再於此處選擇。選擇「預設背景」可恢復原有背景。</p>
  </section>;
  const backgroundFields = <><label>背景圖片<select value={prop("backgroundMediaId")} onChange={(event) => { const selected = media.find((item) => item.id === event.target.value); patch(index, "props", "backgroundMediaId", event.target.value); patch(index, "props", "backgroundUrl", selected?.url ?? ""); if(isHero){patch(index,"props","backgroundVideoMediaId","");patch(index,"props","backgroundVideoUrl","");} }}><option value="">{isConsumerRights || block.zone === "coin-usage" ? "預設背景" : "當前數據庫資源"}</option>{media.filter((item) => item.type === "IMAGE").map((item) => <option key={item.id} value={item.id}>{mediaLabel(item)}</option>)}</select></label>{isHero ? <label>背景視頻<select value={prop("backgroundVideoMediaId")} onChange={(event) => { const selected = media.find((item) => item.id === event.target.value); patch(index, "props", "backgroundVideoMediaId", event.target.value); patch(index, "props", "backgroundVideoUrl", selected?.url ?? ""); }}><option value="">不使用視頻（使用背景圖片）</option>{media.filter((item) => item.type === "VIDEO").map((item) => <option key={item.id} value={item.id}>{mediaLabel(item)}</option>)}</select></label> : null}{positionControl("背景圖位置", "backgroundPosition", isHero ? "50% 0%" : "center center")}{isHero ? positionControl("手機端背景位置", "mobileBackgroundPosition", "65% 50%") : null}</>;
  if (block.zone === "page-background") return <section className="admin-fixed-card admin-fixed-card--editor"><header><h3>{info.title}</h3></header><p>先在素材庫上傳圖片，再選擇背景。保存後會套用到對應頁面；播放背景適用於全部同類播放頁。</p><div className="admin-form-grid">{backgroundFields}</div></section>;
  const aboutPositionFields=<><h4 className="admin-field-group-title">文字位置</h4><p className="admin-panel-note">只移動左側標題與說明，不改變卡片位置。正數向右／向下，負數向左／向上。</p><div className="admin-form-grid">{[["textOffsetX","水平偏移（px）"],["textOffsetY","垂直偏移（px）"]].map(([field,label])=><label key={field}>{label}<input type="range" aria-label={`${label}滑桿`} min={-300} max={300} step={1} value={aboutTextOffset(block.props[field])} onChange={e=>patch(index,"props",field,aboutTextOffset(e.target.value))}/><input type="number" aria-label={label} min={-300} max={300} step={1} value={aboutTextOffset(block.props[field])} onChange={e=>patch(index,"props",field,aboutTextOffset(e.target.value))}/></label>)}<button type="button" className="admin-secondary" onClick={()=>{patch(index,"props","textOffsetX",0);patch(index,"props","textOffsetY",0);}}>恢復預設位置</button></div><p className="admin-panel-note">手機版保留自然排列，避免文字移出畫面。</p></>;
  if(pagePath==="/about"&&isAboutPlatform){
    const plan=aboutPlanProps(block.props);
    return <section className="admin-fixed-card admin-fixed-card--editor"><header><div><p className="admin-kicker">FUTURE PLAN</p><h3>未來規劃設置</h3></div></header>{aboutPositionFields}
      <div className="admin-form-grid">{[["planningTitle","區塊標題"],["planningSubtitle","計畫名稱"],["planningTagline","副標題"],["planningDescription","計畫說明"]].map(([field,label])=><label key={field}>{label}<textarea rows={field==="planningDescription"?5:2} value={plan[field]} onChange={e=>patch(index,"props",field,e.target.value)}/></label>)}</div>
      <h4 className="admin-field-group-title">五個共創步驟</h4>{planPrefixes.map((prefix,i)=><div className="admin-form-grid" key={prefix}><label>步驟 {i+1} 標題<input value={plan[`step${prefix}Title`]} onChange={e=>patch(index,"props",`step${prefix}Title`,e.target.value)}/></label><label>步驟 {i+1} 圖片<select value={prop(`step${prefix}ImageMediaId`)} onChange={e=>{const image=media.find(item=>item.id===e.target.value);patch(index,"props",`step${prefix}ImageMediaId`,e.target.value);patch(index,"props",`step${prefix}ImageUrl`,image?.url??"");}}><option value="">當前圖片／清空</option>{media.filter(item=>item.type==="IMAGE").map(item=><option key={item.id} value={item.id}>{mediaLabel(item)}</option>)}</select></label><label>圖片位置<input value={plan[`step${prefix}ImagePosition`]} onChange={e=>patch(index,"props",`step${prefix}ImagePosition`,e.target.value)}/></label></div>)}
      <h4 className="admin-field-group-title">區塊背景</h4><div className="admin-form-grid">{backgroundFields}</div></section>;
  }
  if (isConsumerRights || (pagePath === "/tasks" && block.zone === "coin-usage")) return <section className="admin-fixed-card admin-fixed-card--editor">
    <header><div><p className="admin-kicker">{info.eyebrow}</p><h3>{info.title}設置</h3></div></header>
    <p>先在圖片和媒體庫上傳圖片，再於此處選擇。背景會鋪滿區塊，說明文字與圖示保持顯示。</p>
    <div className="admin-form-grid">{backgroundFields}</div>
    <button type="button" className="admin-secondary" onClick={() => {
      patch(index, "props", "backgroundMediaId", "");
      patch(index, "props", "backgroundUrl", "");
      patch(index, "props", "backgroundPosition", "center center");
    }}>恢復預設背景</button>
  </section>;
  return <section className="admin-fixed-card admin-fixed-card--editor"><header><div><p className="admin-kicker">{info.eyebrow}</p><h3>{info.title}設置</h3></div><span className="admin-status admin-status--ok">保存即生效</span></header>
    <h4 className="admin-field-group-title">文字內容</h4><div className="admin-form-grid">
      {!isAboutHero ? <label>頂部英文<input value={prop("eyebrow")} onChange={(event) => patch(index, "props", "eyebrow", event.target.value)} /></label> : null}
      <label>{isHero ? "主標題" : "區塊標題"}<textarea rows={isHero ? 3 : 2} value={prop("title")} onChange={(event) => patch(index, "props", "title", event.target.value)} /></label>
      {showsSubtitle ? <label>{isHero ? "副標題" : "第二行標題"}<textarea rows={2} value={prop("subtitle")} onChange={(event) => patch(index, "props", "subtitle", event.target.value)} /></label> : null}
      <label className={showsSubtitle ? "" : "admin-span-2"}>{isHero ? "詳細介紹" : "說明文字"}<textarea rows={3} value={prop("description")} onChange={(event) => patch(index, "props", "description", event.target.value)} /></label>
      {isFeatured ? <><label>右側按鈕文字<input value={prop("actionLabel")} onChange={(event) => patch(index, "props", "actionLabel", event.target.value)} /></label><label>右側按鈕鏈接<input value={prop("actionHref", "/universe")} onChange={(event) => patch(index, "props", "actionHref", event.target.value)} /></label></> : null}
      {isAboutHero ? <label>品牌影片<select value={prop("actionHref", "/video/logo-intro-h264.mp4")} onChange={event => patch(index,"props","actionHref",event.target.value)}><option value="/video/logo-intro-h264.mp4">MY DREAM 品牌介紹</option>{media.filter(item=>item.type==="VIDEO").map(item=><option key={item.id} value={item.url}>{mediaLabel(item)}</option>)}</select></label> : null}
      {isAboutHero || isAboutStory || isAboutJoin ? <><label>按鈕文字<input value={prop("actionLabel")} onChange={(event) => patch(index, "props", "actionLabel", event.target.value)} /></label><label>按鈕鏈接<input value={prop("actionHref", "/universe")} onChange={(event) => patch(index, "props", "actionHref", event.target.value)} /></label></> : null}
      {isUniverseCommunity ? <><label>按鈕文字<input value={prop("actionLabel", "立即加入社群")} onChange={(event) => patch(index, "props", "actionLabel", event.target.value)} /></label><label>按鈕鏈接<input value={aiCommunityInviteHref(prop("actionHref"))} onChange={(event) => patch(index, "props", "actionHref", event.target.value)} /></label></> : null}
      {block.type === "category-tabs" ? <label className="admin-span-2">分類按鈕文字（逗號分隔）<input value={prop("categoryLabels", "全部,古風,都市,漫劇,奇幻,穿越,重生,懸疑,宮鬥宅鬥,女性成長,逆襲,校園,腦洞,現代")} onChange={(event) => patch(index, "props", "categoryLabels", event.target.value)} /></label> : null}
      {isUniverseQuicklinks ? <div className="admin-span-2 admin-form-grid">{["One", "Two", "Three", "Four"].map((suffix, linkIndex) => <div className="admin-form-grid" key={suffix}><label>入口 {linkIndex + 1} 標題<input value={prop(`link${suffix}Title`)} onChange={(event) => patch(index, "props", `link${suffix}Title`, event.target.value)} /></label><label>入口 {linkIndex + 1} 鏈接<input value={prop(`link${suffix}Href`)} onChange={(event) => patch(index, "props", `link${suffix}Href`, event.target.value)} /></label><label className="admin-span-2">入口 {linkIndex + 1} 說明<input value={prop(`link${suffix}Description`)} onChange={(event) => patch(index, "props", `link${suffix}Description`, event.target.value)} /></label></div>)}</div> : null}
    </div>
    {isAboutPlatform ? <><h4 className="admin-field-group-title">三張平台內容卡片</h4>{[1,2,3].map((cardIndex) => { const prefix = ["One","Two","Three"][cardIndex - 1]; const selectedId = prop(`card${prefix}ImageMediaId`); return <div className="admin-form-grid" key={prefix}><label>卡片 {cardIndex} 標題<input value={prop(`card${prefix}Title`)} onChange={(event) => patch(index, "props", `card${prefix}Title`, event.target.value)} /></label><label>卡片 {cardIndex} 圖片<select value={selectedId} onChange={(event) => { const selected = media.find((item) => item.id === event.target.value); patch(index, "props", `card${prefix}ImageMediaId`, event.target.value); if (selected) patch(index, "props", `card${prefix}ImageUrl`, selected.url); }}><option value="">請選擇圖片</option>{media.filter((item) => item.type === "IMAGE").map((item) => <option key={item.id} value={item.id}>{mediaLabel(item)}</option>)}</select></label><label className="admin-span-2">卡片 {cardIndex} 說明<textarea rows={2} value={prop(`card${prefix}Description`)} onChange={(event) => patch(index, "props", `card${prefix}Description`, event.target.value)} /></label><label>按鈕文字<input value={prop(`card${prefix}Action`)} onChange={(event) => patch(index, "props", `card${prefix}Action`, event.target.value)} /></label><label>按鈕鏈接<input value={prop(`card${prefix}Href`)} onChange={(event) => patch(index, "props", `card${prefix}Href`, event.target.value)} /></label></div>; })}</> : null}
    {isAboutJoin ? <><h4 className="admin-field-group-title">四個加入平台功能</h4>{[1,2,3,4].map((benefitIndex) => { const prefix = ["One","Two","Three","Four"][benefitIndex - 1]; return <div className="admin-form-grid" key={prefix}><label>功能 {benefitIndex} 標題<input value={prop(`benefit${prefix}Title`)} onChange={(event) => patch(index, "props", `benefit${prefix}Title`, event.target.value)} /></label><label>功能 {benefitIndex} 說明<input value={prop(`benefit${prefix}Description`)} onChange={(event) => patch(index, "props", `benefit${prefix}Description`, event.target.value)} /></label></div>; })}</> : null}
    {pagePath==="/about"&&isAboutCharacters?aboutPositionFields:null}
    {isAboutCharacters ? <><h4 className="admin-field-group-title">五張原創 IP 角色卡</h4>{[1,2,3,4,5].map((cardIndex) => { const prefix = ["One","Two","Three","Four","Five","Six"][cardIndex - 1]; const selectedId = prop(`card${prefix}ImageMediaId`); return <div className="admin-form-grid" key={prefix}><label>角色 {cardIndex} 名稱<input value={prop(`card${prefix}Title`)} onChange={(event) => patch(index, "props", `card${prefix}Title`, event.target.value)} /></label><label>角色 {cardIndex} 圖片<select value={selectedId} onChange={(event) => { const selected = media.find((item) => item.id === event.target.value); patch(index, "props", `card${prefix}ImageMediaId`, event.target.value); if (selected) patch(index, "props", `card${prefix}ImageUrl`, selected.url); }}><option value="">請選擇圖片</option>{media.filter((item) => item.type === "IMAGE").map((item) => <option key={item.id} value={item.id}>{mediaLabel(item)}</option>)}</select></label>{positionControl(`角色 ${cardIndex} 圖片位置`, `card${prefix}ImagePosition`, "center center")}<label className="admin-span-2">角色 {cardIndex} 說明<textarea rows={2} value={prop(`card${prefix}Description`)} onChange={(event) => patch(index, "props", `card${prefix}Description`, event.target.value)} /></label></div>; })}</> : null}
    {isDownloadPlatforms ? <><h4 className="admin-field-group-title">Android 下載畫面</h4><div className="admin-form-grid">
      <label>標題<input value={prop("androidTitle", "Android 下載")} onChange={(event) => patch(index, "props", "androidTitle", event.target.value)} /></label>
      <label>二維碼圖片<select value={prop("androidQrMediaId")} onChange={(event) => { const selected = media.find((item) => item.id === event.target.value); patch(index, "props", "androidQrMediaId", event.target.value); if (selected) patch(index, "props", "androidQrUrl", selected.url); }}><option value="">請選擇 Android 二維碼</option>{media.filter((item) => item.type === "IMAGE").map((item) => <option key={item.id} value={item.id}>{mediaLabel(item)}</option>)}</select></label>
      <label className="admin-span-2">說明文字<textarea rows={2} value={prop("androidDescription", "使用 Android 手機掃描此二維碼下載。")} onChange={(event) => patch(index, "props", "androidDescription", event.target.value)} /></label>
      <label className="admin-span-2">圖片替代文字<input value={prop("androidQrAlt", "MY DREAM Android 下載二維碼")} onChange={(event) => patch(index, "props", "androidQrAlt", event.target.value)} /></label>
    </div><h4 className="admin-field-group-title">iOS 下載畫面</h4><div className="admin-form-grid">
      <label>標題<input value={prop("iosTitle", "iOS 下載")} onChange={(event) => patch(index, "props", "iosTitle", event.target.value)} /></label>
      <label>二維碼圖片<select value={prop("iosQrMediaId")} onChange={(event) => { const selected = media.find((item) => item.id === event.target.value); patch(index, "props", "iosQrMediaId", event.target.value); if (selected) patch(index, "props", "iosQrUrl", selected.url); }}><option value="">請選擇 iOS 二維碼</option>{media.filter((item) => item.type === "IMAGE").map((item) => <option key={item.id} value={item.id}>{mediaLabel(item)}</option>)}</select></label>
      <label className="admin-span-2">說明文字<textarea rows={2} value={prop("iosDescription", "使用 iPhone 或 iPad 掃描此二維碼下載。")} onChange={(event) => patch(index, "props", "iosDescription", event.target.value)} /></label>
      <label className="admin-span-2">圖片替代文字<input value={prop("iosQrAlt", "MY DREAM iOS 下載二維碼")} onChange={(event) => patch(index, "props", "iosQrAlt", event.target.value)} /></label>
    </div></> : null}
    <h4 className="admin-field-group-title">背景圖片</h4><div className="admin-form-grid">{backgroundFields}</div>
    <h4 className="admin-field-group-title">顏色與格式</h4><div className="admin-form-grid">
      <label>標題顏色<input type="color" value={String(style("titleColor", "#f4c542"))} onChange={(event) => patch(index, "style", "titleColor", event.target.value)} /></label>
      {showsSubtitle ? <label>第二行標題顏色<input type="color" value={String(style("textColor", "#ffd369"))} onChange={(event) => patch(index, "style", "textColor", event.target.value)} /></label> : null}
      <label>說明文字顏色<input type="color" value={String(style("descriptionColor", "#cad6e7"))} onChange={(event) => patch(index, "style", "descriptionColor", event.target.value)} /></label>
      {!isAboutHero ? <label>頂部英文顏色<input type="color" value={String(style("eyebrowColor", isFeatured ? "#19bfff" : "#ffffff"))} onChange={(event) => patch(index, "style", "eyebrowColor", event.target.value)} /></label> : null}
      {!isHero ? <label>背景底色<input type="color" value={String(style("backgroundColor", isFeatured ? "#060b16" : "#07101d"))} onChange={(event) => patch(index, "style", "backgroundColor", event.target.value)} /></label> : null}
      {!isHero && numberField("titleFontSize", isFeatured ? 44 : 34, 24, 88, "標題字號（px）")}
      {!isHero && <>
      <h4 className="admin-field-group-title admin-span-2">文本位置</h4>
      <label>水平位置<select value={String(style("align", "left"))} onChange={(event) => patch(index, "style", "align", event.target.value)}><option value="left">左側</option><option value="center">居中</option><option value="right">右側</option></select></label>
      <label>垂直位置<select value={String(style("verticalAlign", "center"))} onChange={(event) => patch(index, "style", "verticalAlign", event.target.value)}><option value="top">頂部</option><option value="center">垂直居中</option><option value="bottom">底部</option></select><small>所有固定佈局區塊的文字位置均可單獨設置</small></label>
      </>}
      {isHero ? <><p className="admin-panel-note">字號、顏色、位置與間距請到左側「首屏文字統一設置」修改，保存後全部導覽頁同步生效。</p>{numberField("overlay", 0.3, 0, 1, "背景遮罩（0-1）")}</> : <>{numberField("paddingTop", isFeatured ? 64 : 72, 20, 200, "上間距（px）")}{numberField("paddingBottom", isFeatured ? 82 : 72, 20, 200, "下間距（px）")}{numberField("columns", 6, 2, 6, "電腦端卡片列數")}{numberField("gap", 12, 0, 40, "卡片間距（px）")}</>}
    </div>
  </section>;
}

function BatchEpisodeUploader({ api, site, works, content, media, onClose, onSaved, flash }: { api: Api; site: Site; works: ContentSummary[]; content: ContentSummary[]; media: Media[]; onClose: () => void; onSaved: () => void; flash: Flash }) {
  const initialWork = works[0];
  const initialNextEpisode = initialWork ? nextVisibleEpisodeNumber(content, initialWork.id) : 1;
  const [form, setForm] = useState({ workId: initialWork?.id ?? "", startEpisode: initialNextEpisode, count: 1, titlePrefix: "", summary: "", contentLabel: "AI 原創短劇", duration: "完整內容", publishedAt: new Date().toISOString().slice(0, 10), coverMediaId: "", unlockPrice: 0, sortWeight: 0, visible: true });
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [saving, setSaving] = useState(false);
  const images = media.filter((item) => item.type === "IMAGE");
  const selectedWork = works.find((item) => item.id === form.workId);
  const existingNextEpisode = selectedWork ? nextVisibleEpisodeNumber(content, selectedWork.id) : 1;
  const episodeCount = files.length || Math.max(1, Math.floor(form.count));
  const titleFor = (episode: number) => `${form.titlePrefix.trim() || selectedWork?.title || "新劇集"} 第${episode}集`;
  const updateWork = (workId: string) => {
    const work = works.find((item) => item.id === workId);
    const next = work ? nextVisibleEpisodeNumber(content, work.id) : 1;
    setForm((current) => ({ ...current, workId, startEpisode: next }));
  };
  const uploadVideo = async (file: File, episode: number) => {
    const body = new FormData();
    body.set("file", file);
    body.set("name", `${selectedWork?.title ?? "短劇"} 第${episode}集視頻`);
    body.set("altText", titleFor(episode));
    const response = await api<Media | { media?: Media }>(`/admin-api/v1/sites/${site.id}/media`, { method: "POST", body }, true);
    const uploaded = response && typeof response === "object" && "media" in response ? response.media : response;
    if (!uploaded || typeof uploaded !== "object" || !("id" in uploaded)) throw new Error(`第${episode}集視頻上傳後未返回媒體信息`);
    return uploaded as Media;
  };
  const save = async () => {
    if (!selectedWork) { flash("請先選擇所屬作品", "error"); return; }
    if (!Number.isFinite(form.startEpisode) || form.startEpisode < 1) { flash("起始集數必須從 1 開始", "error"); return; }
    if (files.length === 0 && form.count < 1) { flash("請填寫要建立的集數", "error"); return; }
    const duplicateEpisodes = duplicateEpisodeNumbers(content, selectedWork.id, form.startEpisode, episodeCount);
    if (duplicateEpisodes.length > 0) {
      flash(`第 ${duplicateEpisodes.join("、")} 集已存在（包含已歸檔劇集），請更換起始集數`, "error");
      return;
    }
    setSaving(true); setProgress({ current: 0, total: episodeCount });
    let created = 0;
    try {
      for (let index = 0; index < episodeCount; index += 1) {
        const episode = Math.floor(form.startEpisode) + index;
        const uploaded = files[index] ? await uploadVideo(files[index], episode) : undefined;
        const slug = `${selectedWork.slug}-ep${String(episode).padStart(2, "0")}`;
        const body = {
          type: "episode", slug, locale: site.locale, title: titleFor(episode), summary: form.summary.trim(), coverMediaId: form.coverMediaId || null,
          data: { workId: selectedWork.id, workSlug: selectedWork.slug, workTitle: selectedWork.title, episodeNumber: episode, episodeLabel: `EP${String(episode).padStart(2, "0")}`, contentLabel: form.contentLabel, duration: form.duration || "完整內容", views: "待統計", publishedAt: form.publishedAt.replaceAll("-", "/"), videoMediaId: uploaded?.id ?? null, videoUrl: uploaded?.url ?? null, unlockPrice: Math.max(0, Number(form.unlockPrice) || 0), visible: form.visible },
          featured: false, sortWeight: Number(form.sortWeight) - index, relations: [{ type: "episode-of", targetContentId: selectedWork.id, order: episode }], changeNote: "批量添加作品劇集",
        };
        await api(`/admin-api/v1/sites/${site.id}/content`, { method: "POST", body: JSON.stringify(body) }, true);
        created += 1; setProgress({ current: created, total: episodeCount });
      }
      await publishLatestDraft(api, site.id, `批量添加官網劇集：${selectedWork.title}`);
      flash(`已批量創建 ${created} 集${files.length ? "，視頻已上傳並關聯" : "，視頻可在單集編輯中補充"}`);
      onSaved();
    } catch (error) {
      flash(`已創建 ${created} 集；${message(error)}`, "error");
    } finally { setSaving(false); }
  };
  return <Drawer title="批量添加短劇" subtitle="BATCH EPISODE UPLOAD" onClose={onClose} action={<button className="admin-primary" onClick={() => void save()} disabled={saving || !selectedWork}><Upload size={17} />{saving ? `正在處理 ${progress.current}/${progress.total}` : "批量創建並更新官網"}</button>}>
    <div className="admin-lock-note"><ListVideo size={18} /><div><b>先建資料，視頻可後補</b><p>選擇作品並填寫集數信息即可批量建立劇集；選擇多個視頻後會按文件順序自動上傳並關聯到對應集數。未選擇視頻的集數可稍後單獨編輯。</p></div></div>
    <div className="admin-form-grid">
      <label>所屬作品<select value={form.workId} onChange={(event) => updateWork(event.target.value)}><option value="">請選擇作品</option>{works.map((work) => <option key={work.id} value={work.id}>{work.title}</option>)}</select></label>
      <label>起始集數<input type="number" min="1" value={form.startEpisode} onChange={(event) => setForm({ ...form, startEpisode: Number(event.target.value) })} /><small>當前作品建議從第 {existingNextEpisode} 集開始</small></label>
      <label>批量建立集數（未選視頻時使用）<input type="number" min="1" max="200" value={form.count} onChange={(event) => setForm({ ...form, count: Number(event.target.value) })} /></label>
      <label>標題前綴（可選）<input value={form.titlePrefix} onChange={(event) => setForm({ ...form, titlePrefix: event.target.value })} placeholder={selectedWork?.title ?? "默認使用作品名稱"} /></label>
      <label className="admin-span-2">統一簡介<textarea rows={3} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} placeholder="可先填寫整部短劇的簡介，後續可逐集修改。" /></label>
      <label>內容類型<input value={form.contentLabel} onChange={(event) => setForm({ ...form, contentLabel: event.target.value })} /></label>
      <label>上架日期<input type="date" value={form.publishedAt} onChange={(event) => setForm({ ...form, publishedAt: event.target.value })} /></label>
      <label>視頻時長文字<input value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} placeholder="例如 12:45 或完整內容" /></label>
      <label>每集解鎖價格<input type="number" min="0" step="0.01" value={form.unlockPrice} onChange={(event) => setForm({ ...form, unlockPrice: Number(event.target.value) })} /><small>0 表示免費；該數值會同步到 App。</small></label>
      <label>統一排序值<input type="number" value={form.sortWeight} onChange={(event) => setForm({ ...form, sortWeight: Number(event.target.value) })} /></label>
      <label>統一封面（可選）<select value={form.coverMediaId} onChange={(event) => setForm({ ...form, coverMediaId: event.target.value })}><option value="">暫不設置，後續補充</option>{images.map((item) => <option key={item.id} value={item.id}>{mediaLabel(item)}</option>)}</select></label>
      <label className="admin-span-2 admin-upload admin-batch-file-picker"><Upload size={16} />選擇多個短劇視頻（可選）<input type="file" accept="video/*" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} disabled={saving} /></label>
    </div>
    <div className="admin-batch-file-list">{files.length ? <><b>已選擇 {files.length} 個視頻，將從第 {form.startEpisode} 集開始：</b>{files.map((file, index) => <div key={`${file.name}-${index}`}><span>EP{String(Number(form.startEpisode) + index).padStart(2, "0")}</span><span>{file.name}</span><small>{formatBytes(file.size)}</small></div>)}</> : <p>尚未選擇視頻；提交後會先建立 {episodeCount} 集空資料。</p>}</div>
    <div className="admin-toggle-grid"><label className="admin-checkbox"><input type="checkbox" checked={form.visible} onChange={(event) => setForm({ ...form, visible: event.target.checked })} />創建後在作品選集展示</label></div>
  </Drawer>;
}

function EpisodeEditor({ api, site, works, media, value, onClose, onSaved, flash }: { api: Api; site: Site; works: ContentSummary[]; media: Media[]; value?: ContentDraft; onClose: () => void; onSaved: () => void; flash: Flash }) {
  const data = value?.data ?? {};
  const relation = value?.relations?.find((item) => item.type === "episode-of");
  const initialWorkId = relation?.targetContentId ?? String(data.workId ?? works[0]?.id ?? "");
  const initialDate = String(data.publishedAt ?? new Date().toISOString().slice(0, 10)).replaceAll("/", "-");
  const [form, setForm] = useState({
    workId: initialWorkId,
    episodeNumber: Number(data.episodeNumber ?? 1),
    title: value?.title ?? "新劇集",
    summary: value?.summary ?? "",
    coverMediaId: value?.coverMediaId ?? "",
    videoMediaId: String(data.videoMediaId ?? ""),
    duration: String(data.duration ?? ""),
    views: String(data.views ?? "待統計"),
    publishedAt: initialDate,
    contentLabel: String(data.contentLabel ?? "AI 原創短劇"),
    unlockPrice: Number(data.unlockPrice ?? 0),
    visible: data.visible !== false,
    featured: value?.featured ?? true,
    sortWeight: value?.sortWeight ?? 0,
  });
  const images = media.filter((item) => item.type === "IMAGE");
  const videos = media.filter((item) => item.type === "VIDEO");
  const selectedWork = works.find((item) => item.id === form.workId);
  const selectedCover = images.find((item) => item.id === form.coverMediaId);
  const selectedVideo = videos.find((item) => item.id === form.videoMediaId);
  const save = async () => {
    if (!selectedWork) { flash("請先選擇所屬作品", "error"); return; }
    const episode = Math.max(1, Math.floor(form.episodeNumber));
    const slug = value?.slug ?? `${selectedWork.slug}-ep${String(episode).padStart(2, "0")}`;
    const body = {
      ...(value ? { lockVersion: value.lockVersion } : { type: "episode", slug, locale: site.locale }),
      title: form.title,
      summary: form.summary,
      coverMediaId: form.coverMediaId || null,
      data: {
        workId: selectedWork.id,
        workSlug: selectedWork.slug,
        workTitle: selectedWork.title,
        episodeNumber: episode,
        episodeLabel: `EP${String(episode).padStart(2, "0")}`,
        contentLabel: form.contentLabel,
        duration: form.duration || "完整內容",
        views: form.views || "待統計",
        publishedAt: form.publishedAt.replaceAll("-", "/"),
        videoMediaId: form.videoMediaId || null,
        videoUrl: selectedVideo?.url ?? null,
        unlockPrice: Math.max(0, Number(form.unlockPrice) || 0),
        visible: form.visible,
      },
      featured: form.featured,
      sortWeight: Number(form.sortWeight),
      relations: [{ type: "episode-of", targetContentId: selectedWork.id, order: episode }],
      changeNote: "作品劇集內容編輯",
    };
    try {
      await api(value ? `/admin-api/v1/content/${value.id}` : `/admin-api/v1/sites/${site.id}/content`, { method: value ? "PUT" : "POST", body: JSON.stringify(body) }, true);
      await publishLatestDraft(api, site.id, `更新官網劇集：${form.title}`);
      flash("劇集已保存，所屬作品選集已更新");
      onSaved();
    } catch (error) { flash(message(error), "error"); }
  };
  return <Drawer title={value ? `管理劇集：${value.title}` : "新增作品劇集"} subtitle="WORK EPISODE EDITOR" onClose={onClose} action={<button className="admin-primary" onClick={save}><Save size={17} />保存並更新官網</button>}>
    <div className="admin-lock-note"><ListVideo size={18} /><div><b>作品與劇集關聯</b><p>選擇所屬作品後，本集會自動進入該作品詳情頁。封面和視頻可以先留空，後續從媒體庫補充；AI 宇宙原創影片與作品劇集分開管理。</p></div></div>
    <div className="admin-form-grid">
      <label>所屬作品<select value={form.workId} onChange={(event) => setForm({ ...form, workId: event.target.value })}><option value="">請選擇作品</option>{works.map((work) => <option key={work.id} value={work.id}>{work.title}</option>)}</select></label>
      <label>第幾集<input type="number" min="1" value={form.episodeNumber} onChange={(event) => setForm({ ...form, episodeNumber: Number(event.target.value) })} /></label>
      <label>本集標題<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
      <label>內容類型<input value={form.contentLabel} onChange={(event) => setForm({ ...form, contentLabel: event.target.value })} /></label>
      <label className="admin-span-2">本集簡介<textarea rows={3} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></label>
      <label>上架日期<input type="date" value={form.publishedAt} onChange={(event) => setForm({ ...form, publishedAt: event.target.value })} /></label>
      <label>視頻時長<input placeholder="例如 12:45" value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} /></label>
      <label>瀏覽量文字<input value={form.views} onChange={(event) => setForm({ ...form, views: event.target.value })} /></label>
      <label>解鎖價格<input type="number" min="0" step="0.01" value={form.unlockPrice} onChange={(event) => setForm({ ...form, unlockPrice: Number(event.target.value) })} /><small>0 表示免費；保存後同步到 App。</small></label>
      <label>排序數值（越大越靠前）<input type="number" value={form.sortWeight} onChange={(event) => setForm({ ...form, sortWeight: Number(event.target.value) })} /></label>
       <label>本集封面（可選）<select value={form.coverMediaId} onChange={(event) => setForm({ ...form, coverMediaId: event.target.value })}><option value="">不設置封面（使用視頻首幀）</option>{images.map((item) => <option key={item.id} value={item.id}>{mediaLabel(item)}</option>)}</select></label>
      <label>本集視頻<select value={form.videoMediaId} onChange={(event) => setForm({ ...form, videoMediaId: event.target.value })}><option value="">請選擇視頻</option>{videos.map((item) => <option key={item.id} value={item.id}>{mediaLabel(item)}</option>)}</select></label>
       <div className="admin-span-2 admin-episode-media-preview"><div>{selectedCover ? <img src={selectedCover.url} alt="本集封面預覽" /> : selectedVideo ? <video src={selectedVideo.url} muted playsInline preload="metadata" aria-label="本集視頻首幀預覽" /> : <span><ImageIcon />尚未選擇封面（可選）</span>}</div><div>{selectedVideo ? <><ListVideo /><b>{selectedVideo.displayName || selectedVideo.originalName}</b><small>{formatBytes(selectedVideo.size)}</small></> : <span><ListVideo />尚未選擇視頻</span>}</div></div>
    </div>
    <div className="admin-toggle-grid"><label className="admin-checkbox"><input type="checkbox" checked={form.visible} onChange={(event) => setForm({ ...form, visible: event.target.checked })} />在作品選集上架</label></div>
  </Drawer>;
}

function NewsEditor({ api, site, media, value, onClose, onSaved, flash }: { api: Api; site: Site; media: Media[]; value?: ContentDraft; onClose: () => void; onSaved: () => void; flash: Flash }) {
  const data = value?.data ?? {};
  const seo = data.seo && typeof data.seo === "object" && !Array.isArray(data.seo) ? data.seo as Json : {};
  const images = media.filter((item) => item.type === "IMAGE");
  const initialBlocks = newsBodyBlocks(data.bodyBlocks);
  const [blocks, setBlocks] = useState<NewsBodyBlock[]>(initialBlocks.length ? initialBlocks : [{ ...newsBlock("paragraph", "news-block-1"), text: "請輸入消息正文內容。" }]);
  const [form, setForm] = useState({
    slug: value?.slug ?? "new-message",
    locale: value?.locale ?? site.locale,
    title: value?.title ?? "新消息標題",
    subtitle: String(data.subtitle ?? ""),
    summary: value?.summary ?? "",
    category: String(data.category ?? "活動公告"),
    author: String(data.author ?? "My Dream 編輯部"),
    publishedAt: String(data.publishedAt ?? new Date().toISOString().slice(0, 10)).replaceAll("/", "-"),
    coverMediaId: value?.coverMediaId ?? String(data.coverImageMediaId ?? ""),
    coverAlt: String(data.coverAlt ?? ""),
    seoTitle: String(seo.title ?? value?.title ?? ""),
    seoDescription: String(seo.description ?? value?.summary ?? ""),
    seoKeywords: Array.isArray(seo.keywords) ? seo.keywords.join(",") : String(seo.keywords ?? ""),
    canonicalPath: String(seo.canonicalPath ?? (value ? `/news/${value.slug}` : "")),
    ogImageMediaId: String(seo.ogImageMediaId ?? ""),
    ogImageAlt: String(seo.ogImageAlt ?? ""),
    noIndex: seo.noIndex === true,
    visible: data.visible !== false,
    featured: value?.featured ?? false,
    sortWeight: value?.sortWeight ?? 0,
  });
  const selectedCover = images.find((item) => item.id === form.coverMediaId);
  const patchBlock = (index: number, patch: Partial<NewsBodyBlock>) => setBlocks((current) => current.map((block, blockIndex) => blockIndex === index ? { ...block, ...patch } : block));
  const moveBlock = (index: number, direction: -1 | 1) => setBlocks((current) => { const target = index + direction; if (target < 0 || target >= current.length) return current; const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; });
  const save = async () => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) { flash("唯一標識只能使用小寫英文、數字和短橫線", "error"); return; }
    if (!form.title.trim() || !form.summary.trim()) { flash("請填寫消息標題和摘要", "error"); return; }
    if (!form.coverMediaId) { flash("請從圖片和媒體庫選擇消息封面", "error"); return; }
    if (!blocks.length || blocks.some((block) => block.type === "image" ? !block.imageMediaId : !block.text.trim())) { flash("請補全正文區塊內容和圖片", "error"); return; }
    if (form.canonicalPath.trim() && !/^\/(?!\/)[^\\\r\n]*$/.test(form.canonicalPath.trim())) { flash("規範鏈接必須是以單個 / 開頭的站內路徑", "error"); return; }
    const keywords = form.seoKeywords.split(/[，,]/).map((item) => item.trim()).filter(Boolean).slice(0, 12);
    const categoryId = newsCategoryId(form.category);
    const body = {
      ...(value ? { lockVersion: value.lockVersion } : { type: "article", slug: form.slug, locale: form.locale }),
      title: form.title.trim(),
      summary: form.summary.trim(),
      coverMediaId: form.coverMediaId,
      data: {
        subtitle: form.subtitle.trim(), categoryId, category: form.category, author: form.author.trim(), publishedAt: form.publishedAt,
        coverImageMediaId: form.coverMediaId, coverAlt: form.coverAlt.trim() || `${form.title.trim()}消息封面`, visible: form.visible,
        bodyBlocks: blocks.map((block) => block.type === "image" ? { id: block.id, type: block.type, imageMediaId: block.imageMediaId, alt: block.alt.trim() || "消息正文圖片", caption: block.caption.trim() } : { id: block.id, type: block.type, text: block.text.trim() }),
        seo: { title: form.seoTitle.trim() || form.title.trim(), description: form.seoDescription.trim() || form.summary.trim(), keywords, canonicalPath: form.canonicalPath.trim() || `/news/${form.slug}`, ogImageMediaId: form.ogImageMediaId || form.coverMediaId, ogImageAlt: form.ogImageAlt.trim() || form.coverAlt.trim() || `${form.title.trim()}分享圖片`, noIndex: form.noIndex },
      },
      featured: form.featured,
      sortWeight: Number(form.sortWeight),
      relations: value?.relations ?? [],
      changeNote: "消息內容與 SEO 編輯",
    };
    try {
      await api(value ? `/admin-api/v1/content/${value.id}` : `/admin-api/v1/sites/${site.id}/content`, { method: value ? "PUT" : "POST", body: JSON.stringify(body) }, true);
      await publishLatestDraft(api, site.id, `更新官網消息：${form.title}`);
      flash("消息已保存並更新官網"); onSaved();
    } catch (error) { flash(message(error), "error"); }
  };
  return <Drawer title={value ? `編輯消息：${value.title}` : "新增消息"} subtitle="NEWS CONTENT & SEO EDITOR" onClose={onClose} action={<button className="admin-primary" onClick={save}><Save size={17} />保存並更新官網</button>}>
    <div className="admin-lock-note"><FileText size={18} /><div><b>結構化消息編輯</b><p>文章主標題為頁面 H1；正文一級標題和二級標題會自動生成目錄，並使用符合 SEO 的 H2/H3 層級。</p></div></div>
    <div className="admin-news-workspace">
      <div className="admin-news-fields">
        <h3 className="admin-field-group-title">基本信息</h3><div className="admin-form-grid">
          <label>消息標題（H1）<input value={form.title} maxLength={240} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label>唯一標識（英文）<input value={form.slug} disabled={Boolean(value)} onChange={(event) => setForm({ ...form, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} /></label>
          <label className="admin-span-2">二級標題<input value={form.subtitle} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} /></label>
          <label className="admin-span-2">消息摘要<textarea rows={3} value={form.summary} maxLength={1200} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></label>
          <label>消息分類<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{NEWS_CATEGORY_LABELS.map((category) => <option key={category} value={category}>{newsCategoryLabel(category)}</option>)}</select></label>
          <label>作者<input value={form.author} onChange={(event) => setForm({ ...form, author: event.target.value })} /></label>
          <label>發佈日期<input type="date" value={form.publishedAt} onChange={(event) => setForm({ ...form, publishedAt: event.target.value })} /></label>
          <label>排序數值（越大越靠前）<input type="number" value={form.sortWeight} onChange={(event) => setForm({ ...form, sortWeight: Number(event.target.value) })} /></label>
          <label className="admin-span-2">消息封面<select value={form.coverMediaId} onChange={(event) => setForm({ ...form, coverMediaId: event.target.value })}><option value="">請選擇圖片</option>{images.map((item) => <option key={item.id} value={item.id}>{mediaLabel(item)}</option>)}</select></label>
          <label className="admin-span-2">封面替代文字<input value={form.coverAlt} onChange={(event) => setForm({ ...form, coverAlt: event.target.value })} /></label>
        </div>

        <div className="admin-editor-heading"><div><p className="admin-kicker">STRUCTURED CONTENT</p><h3>正文內容</h3></div><div className="admin-news-add-actions">{[["heading1","一級標題"],["heading2","二級標題"],["paragraph","段落"],["image","圖片"],["quote","引用"]].map(([type,label]) => <button className="admin-secondary" type="button" key={type} onClick={() => setBlocks((current) => [...current, newsBlock(type as NewsBodyBlock["type"])])}><Plus size={14} />{label}</button>)}</div></div>
        <div className="admin-block-list">{blocks.map((block, index) => {
          const selectedImage = images.find((item) => item.id === block.imageMediaId);
          return <article className="admin-block-editor admin-news-block" key={block.id}><header><span>{String(index + 1).padStart(2, "0")}</span><div><b>{{ heading1: "一級內容標題（H2）", heading2: "二級內容標題（H3）", paragraph: "正文段落", image: "正文圖片", quote: "重點引用" }[block.type]}</b><small>該區塊將按當前順序展示</small></div><div><button type="button" disabled={index === 0} onClick={() => moveBlock(index, -1)}>↑</button><button type="button" disabled={index === blocks.length - 1} onClick={() => moveBlock(index, 1)}>↓</button><button type="button" onClick={() => setBlocks((current) => current.filter((_, blockIndex) => blockIndex !== index))}><Trash2 size={14} /></button></div></header><div className="admin-form-grid admin-news-block__fields">
            <label>區塊類型<select value={block.type} onChange={(event) => patchBlock(index, { type: event.target.value as NewsBodyBlock["type"] })}><option value="heading1">一級標題（H2）</option><option value="heading2">二級標題（H3）</option><option value="paragraph">正文段落</option><option value="image">正文圖片</option><option value="quote">重點引用</option></select></label>
            {block.type === "image" ? <><label>選擇圖片<select value={block.imageMediaId} onChange={(event) => patchBlock(index, { imageMediaId: event.target.value })}><option value="">請選擇正文圖片</option>{images.map((item) => <option key={item.id} value={item.id}>{mediaLabel(item)}</option>)}</select></label><label>圖片替代文字<input value={block.alt} onChange={(event) => patchBlock(index, { alt: event.target.value })} /></label><label>圖片說明<input value={block.caption} onChange={(event) => patchBlock(index, { caption: event.target.value })} /></label>{selectedImage ? <div className="admin-span-2 admin-news-image-preview"><img src={selectedImage.url} alt={block.alt || "正文圖片預覽"} /><small>{selectedImage.displayName || selectedImage.originalName}</small></div> : null}</> : <label className="admin-span-2">內容<textarea rows={block.type === "paragraph" ? 4 : 2} value={block.text} onChange={(event) => patchBlock(index, { text: event.target.value })} /></label>}
          </div></article>;
        })}</div>

        <h3 className="admin-field-group-title">SEO 設置</h3><div className="admin-form-grid">
          <label>SEO 標題<input value={form.seoTitle} maxLength={70} onChange={(event) => setForm({ ...form, seoTitle: event.target.value })} /><small>{form.seoTitle.length}/70</small></label>
          <label>規範鏈接<input value={form.canonicalPath} placeholder={`/news/${form.slug}`} onChange={(event) => setForm({ ...form, canonicalPath: event.target.value })} /></label>
          <label className="admin-span-2">SEO 描述<textarea rows={3} value={form.seoDescription} maxLength={180} onChange={(event) => setForm({ ...form, seoDescription: event.target.value })} /><small>{form.seoDescription.length}/180</small></label>
          <label className="admin-span-2">SEO 關鍵詞（逗號分隔）<input value={form.seoKeywords} onChange={(event) => setForm({ ...form, seoKeywords: event.target.value })} /></label>
          <label>社交分享圖片<select value={form.ogImageMediaId} onChange={(event) => setForm({ ...form, ogImageMediaId: event.target.value })}><option value="">默認使用消息封面</option>{images.map((item) => <option key={item.id} value={item.id}>{mediaLabel(item)}</option>)}</select></label>
          <label>分享圖片替代文字<input value={form.ogImageAlt} onChange={(event) => setForm({ ...form, ogImageAlt: event.target.value })} /></label>
        </div>
        <div className="admin-toggle-grid"><label className="admin-checkbox"><input type="checkbox" checked={form.visible} onChange={(event) => setForm({ ...form, visible: event.target.checked })} />官網上架</label><label className="admin-checkbox"><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} />重點推薦</label><label className="admin-checkbox"><input type="checkbox" checked={form.noIndex} onChange={(event) => setForm({ ...form, noIndex: event.target.checked })} />禁止搜索引擎收錄</label></div>
      </div>
      <aside className="admin-news-preview"><p className="admin-kicker">ARTICLE PREVIEW</p>{selectedCover ? <img src={selectedCover.url} alt={form.coverAlt || "消息封面預覽"} /> : <div className="admin-news-preview__empty"><ImageIcon />請選擇消息封面</div>}<small>{form.category} · {form.publishedAt}</small><h1>{form.title || "消息標題"}</h1>{form.subtitle ? <h2>{form.subtitle}</h2> : null}<p>{form.summary || "消息摘要會顯示在這裡。"}</p><div>{blocks.map((block) => block.type === "image" ? <figure key={block.id}>{images.find((item) => item.id === block.imageMediaId) ? <img src={images.find((item) => item.id === block.imageMediaId)!.url} alt={block.alt || "正文圖片"} /> : <span>正文圖片</span>}<figcaption>{block.caption}</figcaption></figure> : block.type === "heading1" ? <h2 key={block.id}>{block.text || "一級內容標題"}</h2> : block.type === "heading2" ? <h3 key={block.id}>{block.text || "二級內容標題"}</h3> : block.type === "quote" ? <blockquote key={block.id}>{block.text || "重點引用"}</blockquote> : <p key={block.id}>{block.text || "正文段落"}</p>)}</div></aside>
    </div>
  </Drawer>;
}

function ContentEditor({ api, site, media, existingSlugs, value, onClose, onSaved, flash }: { api: Api; site: Site; media: Media[]; existingSlugs: readonly string[]; value?: ContentDraft; onClose: () => void; onSaved: () => void; flash: Flash }) {
  const data = value?.data ?? {};
  const [form, setForm] = useState({ slug: value?.slug ?? nextAvailableContentSlug("new-work", existingSlugs), locale: value?.locale ?? site.locale, title: value?.title ?? "新作品", summary: value?.summary ?? "", coverMediaId: value?.coverMediaId ?? "", format: String(data.format ?? "AI短劇"), genre: normalizeWorkGenres(data.genre, "都市"), episodeLabel: String(data.episodeLabel ?? "更新中"), freeEpisodeCount: Number(data.freeEpisodeCount ?? 3), showAllEpisodes: data.showAllEpisodes !== false, heat: String(data.heat ?? "NEW"), href: String(data.href ?? ""), imageUrl: String(data.imageUrl ?? ""), imageAlt: String(data.imageAlt ?? ""), featured: value?.featured ?? true, visible: data.visible !== false, isNew: data.isNew === true, sortWeight: value?.sortWeight ?? 0 });
  const episodeOptions = ["更新中", "連載中", "已完結", "即將上線", "暫停更新"];
  const heatOptions = ["NEW", "HOT", "熱門", "推薦", ...Array.from({ length: 21 }, (_, index) => (10 - index / 10).toFixed(1))];
  const selectedGenres = form.genre;
  const availableGenres = [...new Set([...selectedGenres.filter((genre) => !workGenreOptions.includes(genre as typeof workGenreOptions[number])), ...workGenreOptions])];
  const images = media.filter((item) => item.type === "IMAGE");
  const selectedCover = images.find((item) => item.id === form.coverMediaId);
  const coverPreview = selectedCover?.url || form.imageUrl;
  const save = async () => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) { flash("唯一標識只能使用小寫英文、數字和短橫線", "error"); return; }
    if (!value && existingSlugs.includes(form.slug)) { flash(`唯一標識“${form.slug}”已存在，請更換後重試`, "error"); return; }
    if (!form.coverMediaId && !form.imageUrl) { flash("請先從圖片和媒體庫選擇封面照片", "error"); return; }
    try {
      const body = { ...(value ? { lockVersion: value.lockVersion } : { type: "work", slug: form.slug, locale: form.locale }), title: form.title, summary: form.summary, coverMediaId: form.coverMediaId || null, data: { format: form.format, genre: form.genre, episodeLabel: form.episodeLabel, freeEpisodeCount: Math.max(0, Math.floor(form.freeEpisodeCount)), showAllEpisodes: form.showAllEpisodes, heat: form.heat, href: form.href || `/works/${form.slug}`, imageUrl: form.imageUrl, imageAlt: form.imageAlt || `${form.title}作品封面`, visible: form.visible, isNew: form.isNew }, featured: form.featured, sortWeight: Number(form.sortWeight), relations: value?.relations ?? [], changeNote: "作品卡片可視化編輯" };
      await api(value ? `/admin-api/v1/content/${value.id}` : `/admin-api/v1/sites/${site.id}/content`, { method: value ? "PUT" : "POST", body: JSON.stringify(body) }, true);
      await publishLatestDraft(api, site.id, `更新官網作品：${form.title}`);
      flash("作品已保存並更新官網"); onSaved();
    } catch (error) { flash(message(error), "error"); }
  };
  return <Drawer title={value ? `管理作品：${value.title}` : "添加作品"} subtitle="WORK CARD EDITOR" onClose={onClose} action={<button className="admin-primary" onClick={save}><Save size={17} />保存並更新官網</button>}>
    <div className="admin-lock-note"><ImageIcon size={18} /><div><b>作品卡片管理</b><p>卡片網格佈局固定，可以管理每張卡片展示的作品資料和順序。</p></div></div>
    <div className="admin-form-grid">
      <label>作品名稱<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
      <label>唯一標識（英文）<input value={form.slug} disabled={Boolean(value)} onChange={(event) => setForm({ ...form, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} required /></label>
      <label>作品形式<select value={form.format} onChange={(event) => setForm({ ...form, format: event.target.value })}><option>AI短劇</option><option>AI漫劇</option><option>AI動畫</option><option>AI漫畫</option></select></label>
      <fieldset className="admin-genre-picker admin-span-2"><legend>題材分類</legend><div className="admin-genre-picker__selected">{selectedGenres.length ? selectedGenres.map((genre) => <button type="button" className="admin-genre-picker__chip" key={`selected-${genre}`} onClick={() => setForm((current) => ({ ...current, genre: current.genre.filter((item) => item !== genre) }))} aria-label={`移除題材：${genre}`}>{genre}<X size={12} aria-hidden /></button>) : <span>尚未選擇題材</span>}</div><div className="admin-genre-picker__options">{availableGenres.map((genre) => <label className={selectedGenres.includes(genre) ? "is-selected" : ""} key={genre}><input type="checkbox" checked={selectedGenres.includes(genre)} onChange={(event) => setForm((current) => ({ ...current, genre: event.target.checked ? [...current.genre, genre] : current.genre.filter((item) => item !== genre) }))} /><span>{genre}{!workGenreOptions.includes(genre as typeof workGenreOptions[number]) ? "（舊分類）" : ""}</span></label>)}</div><small>直接點擊即可選擇或取消，可同時選擇多個題材；官網篩選會匹配任一已選分類</small></fieldset>
      <label>集數/更新狀態<select value={form.episodeLabel} onChange={(event) => setForm({ ...form, episodeLabel: event.target.value })}>{!episodeOptions.includes(form.episodeLabel) ? <option value={form.episodeLabel}>{form.episodeLabel}（當前值）</option> : null}{episodeOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
      <label>免費試看集數<input type="number" min="0" max="9999" value={form.freeEpisodeCount} onChange={(event) => setForm({ ...form, freeEpisodeCount: Math.max(0, Number(event.target.value)) })} /><small>默認前 3 集免費，第 4 集起提示下載 APP</small></label>
      <label>熱度標籤<select value={form.heat} onChange={(event) => setForm({ ...form, heat: event.target.value })}>{!heatOptions.includes(form.heat) ? <option value={form.heat}>{form.heat}（當前值）</option> : null}{heatOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
      <label className="admin-span-2">作品簡介<textarea rows={3} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></label>
      <label>卡片點擊鏈接<input value={form.href} placeholder={`/works/${form.slug}`} onChange={(event) => setForm({ ...form, href: event.target.value })} /></label>
      <label>排序數值（越大越靠前）<input type="number" value={form.sortWeight} onChange={(event) => setForm({ ...form, sortWeight: Number(event.target.value) })} /></label>
      <label className="admin-span-2">選擇封面照片<select value={form.coverMediaId} onChange={(event) => setForm((current) => ({ ...current, coverMediaId: event.target.value, imageUrl: event.target.value ? "" : current.imageUrl }))}><option value="">{form.imageUrl ? "當前為舊封面，請重新選擇照片" : "請選擇圖片和媒體庫中的照片"}</option>{images.map((item) => <option key={item.id} value={item.id}>{mediaLabel(item)}</option>)}</select></label>
      <div className="admin-span-2 admin-cover-picker-preview">{coverPreview ? <img src={coverPreview} alt={form.imageAlt || `${form.title}封面預覽`} /> : <div><ImageIcon size={28} /><span>{images.length ? "請從上方下拉框選擇封面照片" : "請先到圖片和媒體庫上傳照片"}</span></div>}<p>{selectedCover ? `已選擇：${selectedCover.displayName || selectedCover.originalName}` : form.imageUrl ? "當前舊封面" : "尚未選擇封面"}</p></div>
      <label className="admin-span-2">封面替代文字<input value={form.imageAlt} onChange={(event) => setForm({ ...form, imageAlt: event.target.value })} /></label>
    </div>
    <div className="admin-toggle-grid"><label className="admin-checkbox"><input type="checkbox" checked={form.visible} onChange={(event) => setForm({ ...form, visible: event.target.checked })} />上架展示</label><label className="admin-checkbox"><input type="checkbox" checked={form.showAllEpisodes} onChange={(event) => setForm({ ...form, showAllEpisodes: event.target.checked })} />選集顯示全集</label><label className="admin-checkbox"><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} />首頁優先推薦</label><label className="admin-checkbox"><input type="checkbox" checked={form.isNew} onChange={(event) => setForm({ ...form, isNew: event.target.checked })} />顯示 NEW 標籤</label></div>
  </Drawer>;
}

function Panel({ title, eyebrow, action, children }: { title: string; eyebrow: string; action?: ReactNode; children: ReactNode }) { return <section className="admin-panel"><header><div><p className="admin-kicker">{eyebrow}</p><h2>{title}</h2></div>{action ? <div className="admin-panel__actions">{action}</div> : null}</header>{children}</section>; }
function Table({ headers, children }: { headers: string[]; children: ReactNode }) { return <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{headers.map((header, index) => <th key={`${header}-${index}`}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
function Empty({ icon, title, action }: { icon: ReactNode; title: string; action?: () => void }) { return <div className="admin-empty"><span>{icon}</span><b>{title}</b>{action ? <button className="admin-secondary" onClick={action}><Plus size={15} />立即創建</button> : null}</div>; }
function Drawer({ title, subtitle, onClose, action, children }: { title: string; subtitle: string; onClose: () => void; action: ReactNode; children: ReactNode }) { return <div className="admin-drawer-layer"><button className="admin-drawer-backdrop" onClick={onClose} aria-label="關閉編輯器" /><aside className="admin-drawer"><header><div><p className="admin-kicker">{subtitle}</p><h2>{title}</h2></div><button className="admin-icon-button" onClick={onClose}><X /></button></header><div className="admin-drawer__body">{children}</div><footer><button className="admin-secondary" onClick={onClose}>取消</button>{action}</footer></aside></div>; }
function message(error: unknown) { return error instanceof Error ? error.message : "操作失敗"; }
