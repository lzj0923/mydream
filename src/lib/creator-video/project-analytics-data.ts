import {record} from "./domain";
import {projectEpisodeRow, type AnalyticsVideo} from "../creator-analytics";

export type PublicationRef = {projectId?:string;dramaId:number;episodeId:number;episodeNumber:number;projectTitle:string};
export type ProjectIssue = PublicationRef & {reason:"not_found"|"unavailable"|"mismatch"|"limit"};

/** Only aggregate episodes linked by the authenticated CMS owner. Never substitute another episode. */
export async function loadProjectAnalytics(refs:PublicationRef[], assetBase:string,
 read:(dramaId:number,page:number)=>Promise<unknown>, now=Date.now){
 const unique=[...new Map(refs.map(ref=>[`${ref.dramaId}:${ref.episodeId}`,ref])).values()];
 const videos:AnalyticsVideo[]=[];
 const issues:ProjectIssue[]=[];
 const deadline=now()+20000;
 for(const id of [...new Set(unique.map(ref=>ref.dramaId))]){
  const pending=new Map(unique.filter(ref=>ref.dramaId===id).map(ref=>[Number(ref.episodeId),ref]));
  let reason:ProjectIssue["reason"]="limit";
  try{
   for(let page=1;page<=50;page++){
    if(now()>deadline)break;
    const data=record(await read(id,page));
    if(data.drama===null){reason="not_found";break;}
    if(Number(record(data.drama).id)!==Number(id)){reason="mismatch";break;}
    const episodes=record(data.episodes);
    if(!Array.isArray(episodes.data))throw Error("Missing episodes");
    for(const value of episodes.data){
     const row=record(value),ref=pending.get(Number(row.id));
     if(!ref)continue;
     try{videos.push(projectEpisodeRow(ref,row,assetBase));}
     catch{issues.push({...ref,reason:"mismatch"});}
     pending.delete(Number(row.id));
    }
    if(!pending.size)break;
    if(page>=Number(episodes.last_page||1)){reason="not_found";break;}
   }
  }catch{reason="unavailable";}
  for(const ref of pending.values())issues.push({...ref,reason});
 }
 // Missing data must not disappear from totals and falsely turn into zero.
 for(const issue of issues)videos.push({id:`episode:${issue.episodeId}`,title:`${issue.projectTitle} · 第 ${issue.episodeNumber} 集`,coverUrl:"",status:issue.reason==="not_found"?"App 未返回此劇集":"數據待確認",publishedAt:null,views:null,likes:null,comments:null,collections:null});
 return {videos,projectComplete:issues.length===0&&refs.length<1000,projectCount:unique.length,projectIncomeAvailable:false,projectIssues:issues};
}

export function projectIssueText(issue:ProjectIssue){
 const label=`${issue.projectTitle} · 第 ${issue.episodeNumber} 集`;
 const detail=issue.reason==="not_found"?"App 未返回此劇目或已上架劇集，請聯繫平台核對上架狀態及關聯編號。":issue.reason==="mismatch"?"App 返回資料與關聯編號不一致，請聯繫平台核對。":issue.reason==="limit"?"本次讀取達到時間或分頁上限，請稍後刷新。":"App 暫時讀取失敗，請稍後刷新重試。";
 return `${label}（劇目 ${issue.dramaId} / 劇集 ${issue.episodeId}）：${detail}`;
}
