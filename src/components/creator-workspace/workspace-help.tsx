"use client";
import { useState } from "react";
import { BookOpen, ChevronRight, FileText, Search } from "lucide-react";

type Article = { title: string; text: string; category: string };
export function WorkspaceHelp({ articles, open }: { articles: Article[]; open: (article: Article) => void }) {
  const [query,setQuery] = useState("");
  const filtered = articles.filter(a => `${a.title}${a.text}${a.category}`.includes(query));
  return <div className="cw-help-reference"><section className="cw-help-hero"><h1>請問有什麼可以幫助你？</h1><label><Search size={23}/><input aria-label="搜索幫助內容" placeholder="搜索創作、審核與結算問題" value={query} onChange={e => setQuery(e.target.value)}/></label><div>熱門搜索：{["劇本","審核","結算"].map(word => <button key={word} onClick={() => setQuery(word)}>{word}</button>)}</div></section><div className="cw-help-announcement"><strong>創作指南</strong><span>了解 MY DREAM 原創投稿與合作流程</span></div><div className="cw-help-categories">{articles.map(a => <button key={a.title} onClick={() => open(a)}><BookOpen size={20}/><h2>{a.category}</h2><span>更多 <ChevronRight size={14}/></span></button>)}</div><div className="cw-help-articles">{filtered.map(a => <section className="cw-card" key={a.title}><h2>{a.category}</h2><button onClick={() => open(a)}><FileText size={16}/><span>{a.title}</span><ChevronRight size={14}/></button><p>{a.text.slice(0,85)}…</p></section>)}</div>{!filtered.length && <div className="cw-card cw-home-empty">沒有找到相關內容，請嘗試其他關鍵詞</div>}</div>;
}
