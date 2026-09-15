"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronUp, Film, Flame, Search } from "lucide-react";
import { FilmEmpty } from "./workspace-panels";
import { creatorOptionLabel, type CatalogWork } from "./types";
import { catalogGenres } from "@/lib/catalog-genres";

export function WorkspaceRanking({ catalog }: { catalog: CatalogWork[] }) {
  const [genre,setGenre] = useState("全部題材");
  const [search,setSearch] = useState("");
  const taggedCatalog=catalog.map(work => ({work, tags:catalogGenres(work.genre).map(creatorOptionLabel)}));
  const options=["全部題材",...new Set(taggedCatalog.flatMap(item => item.tags))];
  const rows=taggedCatalog.filter(({work,tags}) => (genre === "全部題材" || tags.includes(genre)) && work.title.includes(search)).map(item => item.work).sort((a,b) => b.heat-a.heat);
  return <div className="cw-ranking-page"><div className="cw-ranking-hero"><h1>❧ 作品熱播榜 ❧</h1><p>發現平台熱門原創作品，了解故事題材與創作方向。</p></div><div className="cw-ranking-layout"><aside><h2><Film size={16}/>作品排行榜 <ChevronUp size={14}/></h2><button className="is-active">熱播榜</button></aside><section><div className="cw-ranking-filters"><div>{options.map(option => <button key={option} className={genre === option ? "is-active" : ""} onClick={() => setGenre(option)}>{creatorOptionLabel(option)}</button>)}</div><label className="cw-search"><Search size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索作品名稱" aria-label="搜索排行榜作品"/></label></div>{rows.map((work,i) => <Link className="cw-ranking-row" key={work.id} href={`/works/${work.slug}`} target="_blank"><b className={i<3 ? "is-top" : ""}>{String(i+1).padStart(2,"0")}</b><div className="cw-ranking-poster">{work.coverUrl && <Image src={work.coverUrl} alt="" fill sizes="90px" unoptimized/>}</div><div className="cw-ranking-description"><h2>{work.title}</h2><p>MY DREAM 原創作品 · {work.episodes} 集</p><span>{creatorOptionLabel(work.genre)}</span></div><div className="cw-ranking-heat"><Flame size={17}/>{work.heat.toLocaleString()} 熱度</div></Link>)}{!rows.length && <FilmEmpty title="暫無符合條件的作品"/>}</section></div></div>;
}
