"use client";
import {projectEventMessage} from "@/lib/creator-video/project-event-message";
import {useState} from "react";
import {Bell,RefreshCw,ArrowRight,Check} from "lucide-react";
import "./workspace-notifications.css";
import type {NotificationFeed} from "./use-creator-notifications";
const kindLabels:Record<string,string>={SUBMITTED:"待審核",RETURNED:"需要修改",APPROVED:"審核通過",PUBLISHED:"上架更新",SYNC:"資料同步",PROJECT:"項目更新",ALERT:"作品異常"};
export function CreatorNotifications({feed}:{feed:NotificationFeed}){
 const {items,error,loading,marking,read,refresh}=feed;
 const [tab,setTab]=useState("ALL");
 const visible=items.filter(n=>tab==="ALL"||tab==="UNREAD"&&!n.isRead||tab==="REVIEW"&&["APPROVED","RETURNED","SUBMITTED"].includes(n.kind)||tab===n.kind);
 return <section className="cw-card cn-center"><header><div><h1 className="cw-page-title">消息中心</h1><p>提交、審核、上架及資料同步進度</p></div><div><button disabled={marking||!items.some(n=>!n.isRead)} onClick={()=>void read(items.filter(n=>!n.isRead).map(n=>n.id))}><Check size={14}/>列表全部已讀</button><button onClick={()=>refresh()}><RefreshCw size={14}/>刷新</button></div></header><nav>{[["ALL","全部通知"],["UNREAD","未讀"],["REVIEW","審核進度"],["RETURNED","需要修改"],["ALERT","作品異常"],["PUBLISHED","上架通知"],["SYNC","資料同步"]].map(([key,label])=><button className={key===tab?"is-active":""} key={key} onClick={()=>setTab(key)}>{label}{key==="UNREAD"&&` · ${items.filter(n=>!n.isRead).length}`}</button>)}</nav>{error&&<p role="alert" className="cn-error">{error}</p>}{loading?<p className="cn-empty">正在讀取通知…</p>:!visible.length?<div className="cn-empty"><Bell size={26}/><p>暫無此類通知</p></div>:<div>{visible.map(n=><article key={n.id} className={n.isRead?"":"is-unread"}><span className="cn-dot"/><div><div className="cn-notice-heading"><h3>{n.title}</h3><span className={`cn-kind is-${n.kind.toLowerCase()}`}>{kindLabels[n.kind]||"項目更新"}</span></div><p>{projectEventMessage(n.message)}</p><time>{new Date(n.createdAt).toLocaleString("zh-TW")}</time></div><a aria-label={`${n.title}：${n.kind==="RETURNED"?"查看修改意見":"查看進度"}`} href={n.href} onClick={()=>{if(!n.isRead)void read([n.id]);}}>{n.kind==="RETURNED"?"查看修改意見":n.href.includes("episode=")?"查看本集進度":"查看項目"}<ArrowRight size={14}/></a></article>)}</div>}<small>顯示最近 500 條項目通知</small></section>;
}
