import { record, formToken } from "../app-admin/domain";
import { priceValue, selectOptions } from "../creator-video/publish-domain";
export type SyncSnapshot={settings:{area:string;category:string;landscape:boolean;price:string|number};publications:{dramaId:number;episodeId:number;episodeNumber:number}[]};
type Gateway={get:(route:string,html?:boolean)=>Promise<unknown>;post:(route:string,body:URLSearchParams)=>Promise<unknown>};
export async function synchronizeProject(gateway:Gateway,snapshot:SyncSnapshot){
 const {settings,publications}=snapshot;const dramaIds=[...new Set(publications.map(p=>Number(p.dramaId)))];
 if(dramaIds.length!==1||!Number.isSafeInteger(dramaIds[0])||dramaIds[0]<1)throw Error("項目 App 劇目關聯不一致，已停止同步");
 const dramaId=dramaIds[0],price=priceValue(String(settings.price));
 async function row(kind:string,id:number){const data=record(await gateway.get(`short/${kind}/index?`+new URLSearchParams({offset:"0",limit:"2",filter:JSON.stringify({id}),op:JSON.stringify({id:"="})})));const rows=Array.isArray(data.rows)?data.rows.map(record):[];if(rows.length!==1||Number(rows[0].id)!==id)throw Error("App 關聯記錄不存在，請核對上架關聯");return rows[0];}
 const drama=await row("drama",dramaId);
 const dramaMatches=(r:Record<string,unknown>)=>String(r.area)===settings.area&&Number(r.is_landscape)===(settings.landscape?1:0)&&Number(r.unlock_price)===Number(price)&&Array.isArray(r.typerelation)&&r.typerelation.length===1&&String(record(r.typerelation[0]).type_id)===settings.category;
 // Verify all episode ownership before the first write.
 for(const p of publications){if(!Number.isSafeInteger(Number(p.episodeId))||Number(p.episodeId)<1)throw Error("App 劇集編號無效");const e=await row("episode",Number(p.episodeId));if(Number(e.drama_id)!==dramaId||Number(e.drama_num)!==Number(p.episodeNumber))throw Error("App 劇集歸屬不一致，已停止同步");}
 if(!dramaMatches(drama)){
  const route=`short/drama/edit/ids/${dramaId}`,html=String(await gateway.get(route,true));
  if(!html.includes("row[area]")||!selectOptions(html,"row[area]").some(o=>o.value===settings.area)||!selectOptions(html,"type[]").some(o=>o.value===settings.category))throw Error("App 不支持所選地區或分類，請核對設定");
  const body=new URLSearchParams({"row[area]":settings.area,"type[]":settings.category,"row[is_landscape]":settings.landscape?"1":"0","row[unlock_price]":price});const token=formToken(html);if(token)body.set("__token__",token);await gateway.post(route,body);
  if(!dramaMatches(await row("drama",dramaId)))throw Error("劇目資料寫入後核對不一致，請重試同步");
 }
 for(const p of publications){const e=await row("episode",Number(p.episodeId));if(Number(e.drama_id)!==dramaId||Number(e.drama_num)!==Number(p.episodeNumber))throw Error("同步期間劇集關聯發生變化");if(Number(e.unlock_price)===Number(price))continue;
  const route=`short/episode/edit/ids/${p.episodeId}`,html=String(await gateway.get(route,true));if(!html.includes("row[unlock_price]"))throw Error("無法讀取劇集價格表單，請確認編輯權限");const body=new URLSearchParams({"row[unlock_price]":price});const token=formToken(html);if(token)body.set("__token__",token);await gateway.post(route,body);const checked=await row("episode",Number(p.episodeId));if(Number(checked.unlock_price)!==Number(price)||Number(checked.drama_id)!==dramaId)throw Error("劇集價格寫入後核對失敗，可重試完成剩餘同步");
 }
 return {dramaId,episodes:publications.length};
}
