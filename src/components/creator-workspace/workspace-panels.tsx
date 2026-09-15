"use client";

import { CreatorAccountSettings } from "./creator-account";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { WorkspaceData } from "./types";

export function FilmEmpty({ title = "暫無數據", children }: { title?: string; children?: ReactNode }) {
  return <div className="cw-film-empty"><svg width="110" height="110" viewBox="0 0 110 110" fill="none" aria-hidden="true"><ellipse cx="46" cy="54" rx="30" ry="38" fill="#eeeeee" transform="rotate(-15 46 54)"/><ellipse cx="46" cy="54" rx="26" ry="34" stroke="#dedede" strokeWidth="2" transform="rotate(-15 46 54)"/><path d="M31 66 22 95 48 105 57 76" fill="#e6e6e6"/><ellipse cx="62" cy="53" rx="29" ry="38" fill="#d2d2d2" transform="rotate(12 62 53)"/><ellipse cx="65" cy="52" rx="25" ry="35" fill="#c4c4c4" transform="rotate(12 65 52)"/>{[[65,28],[49,42],[77,45],[54,66],[72,75]].map(([cx,cy]) => <ellipse key={cy} cx={cx} cy={cy} rx="6" ry="10" fill="#fafafa" transform={`rotate(12 ${cx} ${cy})`}/>)}<circle cx="64" cy="53" r="4" fill="#eeeeee"/></svg><p>{title}</p>{children}</div>;
}

export function SupplementaryPanel({ section, workspace, navigate }: { section: string; workspace: WorkspaceData | null; navigate: (section: "profile" | "contracts" | "videos" | "help") => void }) {
  if (section === "account") return <CreatorAccountSettings workspace={workspace} navigate={navigate}/>;
  if (section === "signature") return <section className="cw-card cw-full-panel"><div className="cw-card-title"><h1 className="cw-page-title">我的署名短劇</h1><button className="cw-text-button" onClick={() => navigate("videos")}>查看我的作品</button></div><FilmEmpty title="暫無署名短劇"><span>作品署名將隨平台合作信息展示</span></FilmEmpty></section>;
  return <section className="cw-card cw-full-panel"><div className="cw-card-title"><h1 className="cw-page-title">邀約管理</h1></div><FilmEmpty title="暫無合作邀約"><span>你可以聯繫平台，了解原創合作事宜</span><Link href="/contact" className="cw-primary">聯繫平台</Link></FilmEmpty></section>;
}

export function WorkspaceMessages({ workspace }: { workspace: WorkspaceData | null }) {
  const [tab,setTab] = useState("全部通知");
  const rows=(workspace?.scripts ?? []).filter(s => s.reviewNote && (tab === "全部通知" || (tab === "審核修改" ? s.status === "CHANGES_REQUESTED" : s.status === "APPROVED")));
  return <section className="cw-card cw-full-panel"><div className="cw-card-title"><h2>消息中心</h2></div><div className="cw-tabs">{["全部通知","劇本評估","審核修改"].map(label => <button key={label} className={tab === label ? "is-active" : ""} onClick={() => setTab(label)}>{label}</button>)}</div>{rows.length ? <div className="cw-message-list">{rows.map(s => <article key={s.id}><h3>{s.title} · {s.status === "CHANGES_REQUESTED" ? "審核修改" : "劇本評估"}</h3><p>{s.reviewNote}</p><time>{s.updatedAt.slice(0,16).replace("T"," ")}</time></article>)}</div> : <FilmEmpty title={workspace ? "暫無通知" : "登錄後查看你的通知"}/>}</section>;
}
