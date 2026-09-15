import {sumRewards,type Reward} from "../creator-analytics";
import type {PublicationRef} from "../creator-video/project-analytics-data";
/** A ledger reference must match exactly one CMS-owned project. Account totals are never prorated. */
export function projectIncome(rewards:Reward[],refs:PublicationRef[],complete:boolean){
 const grouped=new Map<string,{projectId:string;title:string;rows:Reward[]}>();const unattributed:Reward[]=[];
 for(const row of rewards){
  const matches=refs.filter(ref=>ref.projectId&&row.attributionBasis&&row.dramaId===ref.dramaId&&row.episodeId===ref.episodeId);
  const owners=new Set(matches.map(ref=>ref.projectId));
  if(owners.size!==1){unattributed.push(row);continue;}
  const ref=matches[0],key=ref.projectId!;const group=grouped.get(key)||{projectId:key,title:ref.projectTitle,rows:[]};group.rows.push(row);grouped.set(key,group);
 }
 return {complete,unattributed:sumRewards(unattributed),items:[...grouped.values()].map(group=>({projectId:group.projectId,title:group.title,amount:sumRewards(group.rows),entries:group.rows.length})),available:grouped.size>0};
}
export type ProjectIncome=ReturnType<typeof projectIncome>;
