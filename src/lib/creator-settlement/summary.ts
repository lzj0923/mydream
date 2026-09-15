import { sumRewards, type Reward } from "../creator-analytics";
import { settlementPage, type SettlementRow } from "./domain";
export type EarningsSummary={projects?:import("./project-income").ProjectIncome|null;income:string|null;incomeComplete:boolean;pending:string|null;paid:string|null;withdrawalsComplete:boolean;months:{month:string;amount:string}[]};
export async function loadWithdrawals(owner:number,read:(page:number)=>Promise<unknown>){
 const rows:SettlementRow[]=[];const seen=new Set<string>();let complete=false;
 for(let page=1;page<=10;page++){
  const data=settlementPage(await read(page),"withdrawals",owner);
  for(const row of data.items)if(!seen.has(row.id)){seen.add(row.id);rows.push(row);}
  if(page*100>=data.total){complete=true;break;}if(data.items.length<100)break;
 }
 return {rows,complete};
}
function amount(rows:SettlementRow[]){
 if(rows.some(row=>row.actualAmount===null||!/^\d+(?:\.\d+)?$/.test(row.actualAmount)))return null;
 return sumRewards(rows.map(row=>({id:row.id,date:row.createdAt,amount:row.actualAmount!})));
}
export function earningsSummary(rewards:Reward[]|null,incomeComplete:boolean,withdrawals:{rows:SettlementRow[];complete:boolean}|null):EarningsSummary{
 const grouped=new Map<string,Reward[]>();
 for(const row of rewards??[]){
  const date=/^\d{10,13}$/.test(row.date)?new Date(Number(row.date)*(row.date.length===10?1000:1)+8*3600000).toISOString():row.date;
  if(!/^\d{4}-\d{2}/.test(date))continue;
  const month=date.slice(0,7);grouped.set(month,[...(grouped.get(month)??[]),row]);
 }
 return {income:rewards===null?null:sumRewards(rewards),incomeComplete,
  pending:withdrawals?amount(withdrawals.rows.filter(row=>row.status==="待處理")):null,
  paid:withdrawals?amount(withdrawals.rows.filter(row=>row.status==="已打款")):null,
  withdrawalsComplete:withdrawals?.complete??false,
  months:[...grouped].sort(([a],[b])=>a.localeCompare(b)).slice(-6).map(([month,rows])=>({month,amount:sumRewards(rows)}))};
}
