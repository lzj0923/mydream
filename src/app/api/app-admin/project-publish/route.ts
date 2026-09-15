import {NextRequest,NextResponse} from "next/server";
import {state,authenticated,exclusive,upstream,persist,AdminError} from "@/lib/app-admin/server";
import {isAllowedOrigin} from "@/lib/app-auth/request-security";
import {reviewToken} from "@/lib/app-admin/review-token";
import {record,formToken} from "@/lib/app-admin/domain";
import {prepareAppDraft,DraftError} from "@/lib/creator-video/app-draft";
import {withDraftOperation} from "@/lib/creator-video/app-draft-store";
import {withProjectPublication} from "@/lib/creator-video/publication-store";
import {acceptedForPublication,priceValue,selectOptions} from "@/lib/creator-video/publish-domain";
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
function failed(e:unknown){return json({message:e instanceof Error?e.message:"上架失敗，請刷新核對結果"},e instanceof AdminError||e instanceof DraftError?e.status:503);}
async function cms(actor:number,route:string,body?:unknown){
 const uri="/creator-api/v1/"+route,method=body===undefined?"GET":"POST";
 const r=await fetch((process.env.CMS_API_URL||"http://127.0.0.1:8080").replace(/\/$/,"")+uri,{method,headers:{"Content-Type":"application/json",Authorization:"Bearer "+reviewToken(actor,method,uri,process.env.CMS_APP_REVIEW_KEY||"")},body:body===undefined?undefined:JSON.stringify(body),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(45000)});
 const data=await r.json();if(!r.ok)throw new DraftError(data.detail||"審核資料讀取失敗",r.status);return data;
}
export async function GET(request:NextRequest){try{const s=await state();authenticated(s);return await exclusive(s,async()=>{try{
 const search=(request.nextUrl.searchParams.get("search")||"").slice(0,100);
 const rows=record(await upstream(s,"short/drama/index?"+new URLSearchParams({offset:"0",limit:"50",sort:"id",order:"desc",search})));
 let html="";try{html=String(await upstream(s,"short/drama/add",undefined,true));}catch(e){if(!(e instanceof AdminError)||e.status!==403)throw e;}
 return json({dramas:(Array.isArray(rows.rows)?rows.rows:[]).map(r=>{const row=record(r);return {id:row.id,title:row.title};}),areas:selectOptions(html,"row[area]"),categories:selectOptions(html,"type[]")});
 }finally{await persist(s);}});}catch(e){return failed(e);}}
export async function POST(request:NextRequest){
 if(!request.headers.get("origin")||!isAllowedOrigin(request))return json({message:"請求來源無效"},403);
 try{const s=await state();authenticated(s);const raw=await request.text();if(Buffer.byteLength(raw)>8192)throw new DraftError("請求過大",413);const b=record(JSON.parse(raw));
 const projectId=String(b.projectId||""),submissionId=String(b.submissionId||"");if(!/^[a-zA-Z0-9-]{1,80}$/.test(submissionId)||!Number.isInteger(b.version))throw new DraftError("交付版本無效",400);

 return await exclusive(s,async()=>{try{return await withProjectPublication(projectId,async(saved,save)=>{
 // Check the current App session and permission before accessing private review data.
 await upstream(s,"short/drama/index?offset=0&limit=1");
 const route=`project-reviews/${projectId}/episodes`,project=record(await cms(s.actor!.id,route));
 const episode=acceptedForPublication(project,submissionId,Number(b.version));
 const settings=record(project.settings);
 if(!settings.area||!settings.category||settings.landscape===undefined||settings.price===undefined)throw new DraftError("請先由創作者在項目詳情補充上架資料");
 const price=priceValue(String(settings.price));
 const publications=Array.isArray(project.publications)?project.publications.map(record):[];
 // A verified CMS reassociation supersedes the local draft cache.
 const deletionHistory=Array.isArray(project.publicationHistory)?project.publicationHistory.map(record):[];
 const releasedSaved=!!saved.dramaId&&!publications.length&&deletionHistory.some(h=>h.status==="DELETED"&&Number(h.appDramaId)===saved.dramaId);
 if(releasedSaved){await save({});saved={};}
 let dramaId=Number(publications[0]?.appDramaId||saved.dramaId||b.dramaId||0);
 if(Number(b.dramaId)>0&&dramaId>0&&Number(b.dramaId)!==dramaId)throw new DraftError("此項目已對應另一個 App 劇目");
 if(publications.some(p=>Number(p.appDramaId)!==dramaId))throw new DraftError("項目各集必須使用同一個 App 劇目");
 const findDrama=async(title:string)=>{const r=record(await upstream(s,"short/drama/index?"+new URLSearchParams({offset:"0",limit:"2",filter:JSON.stringify({title}),op:JSON.stringify({title:"="})})));return Array.isArray(r.rows)?r.rows.map(record):[];};
 if(!dramaId){
  const title=String(project.title||"");if(!title)throw new DraftError("項目名稱缺失");
  if(saved.creating)throw new DraftError("上次建立劇目的結果尚待核對，請在本平台短劇管理確認編號後選擇已有劇目，避免重複建立");
  if((await findDrama(title)).length)throw new DraftError("App 已有同名劇目，請選擇已有劇目");
  const html=String(await upstream(s,"short/drama/add",undefined,true));
  if(!selectOptions(html,"row[area]").some(v=>v.value===settings.area)||!selectOptions(html,"type[]").some(v=>v.value===settings.category))throw new DraftError("請選擇有效的地區和分類",400);
  const params=new URLSearchParams({"row[title]":title,"row[description]":String(project.synopsis||""),"row[cover_image]":episode.coverUrl,"row[area]":String(settings.area),"type[]":String(settings.category),"row[drama_count]":String(project.episodeCount),"row[unlock_price]":price,"row[total_views]":"0","row[is_allregion]":"1","row[is_landscape]":settings.landscape===true?"1":"0","row[status]":"draft"});
  const token=formToken(html);if(token)params.set("__token__",token);
  await save({creating:true,title});await upstream(s,"short/drama/add",params);
  const created=await findDrama(title);if(created.length!==1||!Number.isSafeInteger(Number(created[0].id)))throw new DraftError("劇目建立結果需核對，請勿重複建立",502);
  dramaId=Number(created[0].id);await save({dramaId,title});
 }
 if(!Number.isSafeInteger(dramaId)||dramaId<1)throw new DraftError("請選擇 App 劇目",400);
 const verifyDrama=async()=>{const r=record(await upstream(s,"short/drama/index?"+new URLSearchParams({offset:"0",limit:"1",filter:JSON.stringify({id:dramaId}),op:JSON.stringify({id:"="})})));const rows=Array.isArray(r.rows)?r.rows.map(record):[];const row=rows.find(r=>Number(r.id)===dramaId);if(!row)throw new DraftError("劇目不存在或無訪問權限",404);return row;};
 await verifyDrama();await save({dramaId});
 return await withDraftOperation(dramaId,episode.episodeNumber,async(prior,saveDraft)=>{
 const gateway={get:(path:string,html=false)=>upstream(s,path,undefined,html),post:(path:string,body:URLSearchParams)=>upstream(s,path,body),save:saveDraft};
 const draft=await prepareAppDraft(gateway,episode,dramaId,prior);
 // Recheck the accepted version immediately before the externally visible change.
 acceptedForPublication(await cms(s.actor!.id,route),submissionId,Number(b.version));
 if(draft.status!=="published"){
 const html=String(await upstream(s,`short/episode/edit/ids/${draft.episodeId}`,undefined,true));
 const params=new URLSearchParams({"row[drama_id]":String(dramaId),"row[drama_num]":String(episode.episodeNumber),"row[title]":episode.title,"row[description]":episode.description,"row[thumbnail]":episode.coverUrl,"row[video_url]":`/vod/${episode.vodVideoId}`,"row[video_attachment_id]":episode.vodVideoId,"row[unlock_price]":price,"row[status]":"published"});
 const token=formToken(html);if(token)params.set("__token__",token);await upstream(s,`short/episode/edit/ids/${draft.episodeId}`,params);
 }
 const drama=await verifyDrama();if(drama.status!=="published")await upstream(s,`short/drama/editstatus/ids/${dramaId}`,new URLSearchParams({"row[status]":"published"}));
 if((await verifyDrama()).status!=="published")throw new DraftError("App 劇目尚未上架，請刷新核對",502);
 try{await cms(s.actor!.id,`${route}/${submissionId}/publication`,{dramaId,episodeId:draft.episodeId,version:b.version});}
 catch(e){throw new DraftError(`App 已執行上架，但關聯核對未完成（劇目 ${dramaId}，劇集 ${draft.episodeId}）。請重試核對：${e instanceof Error?e.message:"服務暫時不可用"}`,502);}
 return json({ok:true,dramaId,episodeId:draft.episodeId,message:"本集已上架，App 關聯已保存"});
 });
 });}finally{await persist(s);}});
 }catch(e){return failed(e);}
}
