import { record } from "../app-admin/domain";
import { DraftError, type AcceptedEpisode } from "./app-draft";
export function acceptedForPublication(project:unknown,id:string,version:number):AcceptedEpisode {
 const p=record(project),rows=Array.isArray(p.submissions)?p.submissions.map(record):[];
 if(p.publicationAllowed!==true)throw new DraftError("創作者身份認證尚未通過，暫時不能上架");
 const row=rows.find(r=>r.id===id);
 if(!row||row.state!=="APPROVED"||row.version!==version||rows.some(r=>r.episodeNumber===row.episodeNumber&&Number(r.revision)>Number(row.revision)))throw new DraftError("只能上架最新且審核通過的版本，請刷新後重試");
 const recovery=p.stage==="COMPLETED"&&Array.isArray(p.publications)&&p.publications.map(record).some(link=>link.submissionId===id);
 if(p.stage!=="PRODUCING"&&!recovery)throw new DraftError("項目當前不可上架");
 return row as unknown as AcceptedEpisode;
}
export function priceValue(value:unknown):string{
 if(typeof value!=="string"||!/^\d{1,6}(\.\d{1,2})?$/.test(value))throw new DraftError("請填寫有效的單集解鎖價格",400);
 return Number(value).toFixed(2);
}
export function selectOptions(html:string,name:string):{value:string;label:string}[]{
 const block=(html.match(/<select\b[^>]*>[\s\S]*?<\/select>/gi)||[]).find(s=>s.includes(`name="${name}"`)||s.includes(`name='${name}'`));
 return [...(block||"").matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)].filter(m=>!(/\bdisabled\b/i.test(m[1]))).map(m=>({value:m[1].match(/\bvalue=["']([^"']*)["']/i)?.[1]||"",label:m[2].replace(/<[^>]*>/g,"").replace(/&nbsp;|[├└]/g," ").trim()})).filter(o=>o.value);
}
