import {NextRequest,NextResponse} from "next/server";
import {state,authenticated,exclusive,upstream,persist,AdminError} from "@/lib/app-admin/server";
import {reviewToken} from "@/lib/app-admin/review-token";
import {isAllowedOrigin} from "@/lib/app-auth/request-security";
import {record} from "@/lib/app-admin/domain";
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(request:NextRequest){
 if(!request.headers.get("origin")||!isAllowedOrigin(request))return json({message:"請求來源無效"},403);
 try{
  const raw=await request.text();if(raw.length>500)throw Error("請求過大");
  const {projectId,episodeNumber}=JSON.parse(raw);if(!/^[a-zA-Z0-9-]{1,80}$/.test(projectId)||!Number.isInteger(episodeNumber)||episodeNumber<1||episodeNumber>500)throw Error("項目或集數無效");
  const s=await state();authenticated(s);
  return await exclusive(s,async()=>{try{
   await upstream(s,"short/drama/index?offset=0&limit=1");
   async function cms(action:string,body?:unknown){const uri=`/creator-api/v1/project-reviews/${projectId}/${action}`,method=body===undefined?"GET":"POST";
    const r=await fetch((process.env.CMS_API_URL||"http://127.0.0.1:8080")+uri,{method,headers:{"Content-Type":"application/json",Authorization:"Bearer "+reviewToken(s.actor!.id,method,uri,process.env.CMS_APP_REVIEW_KEY||"")},body:body===undefined?undefined:JSON.stringify(body),cache:"no-store",signal:AbortSignal.timeout(45000)});const d=await r.json();if(!r.ok)throw Error(d.detail||"核對失敗");return d;}
   const detail=await cms("episodes");const p=detail.publications.find((x:{episodeNumber:number})=>x.episodeNumber===episodeNumber);if(!p)throw Error("本集已無有效關聯，請刷新");
   // Original admin endpoint includes drafts/offline episodes. Empty public lists are insufficient.
   const result=record(await upstream(s,"short/episode/index?"+new URLSearchParams({offset:"0",limit:"1",filter:JSON.stringify({id:String(p.appEpisodeId)}),op:JSON.stringify({id:"="})})));
   if(!Array.isArray(result.rows)||Number(result.total)!==0||result.rows.length!==0)throw Error("App 劇集仍存在或無法確認刪除，保持鎖定，請核查下架原因");
   await cms("confirm-deletion",{episodeNumber,submissionId:p.submissionId,dramaId:p.appDramaId,episodeId:p.appEpisodeId});
   return json({ok:true,message:"已確認刪除，本集可重新上傳，並已通知創作者"});
  }finally{await persist(s);}});
 }catch(e){return json({message:e instanceof Error?e.message:"核對失敗"},e instanceof AdminError?e.status:409);}
}
