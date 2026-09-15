import {NextRequest,NextResponse} from "next/server";
import {state,authenticated,exclusive,upstream,persist,AdminError} from "@/lib/app-admin/server";
import {reviewToken} from "@/lib/app-admin/review-token";
import {isAllowedOrigin} from "@/lib/app-auth/request-security";
import {withProjectPublication} from "@/lib/creator-video/publication-store";
import {synchronizeProject,type SyncSnapshot} from "@/lib/creator-video/project-sync";
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(request:NextRequest){
 if(!request.headers.get("origin")||!isAllowedOrigin(request))return json({message:"請求來源無效"},403);
 try{const raw=await request.text();if(raw.length>500)throw Error("請求過大");const {projectId}=JSON.parse(raw);if(typeof projectId!=="string"||! /^[a-zA-Z0-9-]{1,80}$/.test(projectId))throw Error("項目編號無效");const session=await state();authenticated(session);
 async function cms(action:string,body:unknown){const uri=`/creator-api/v1/project-reviews/${projectId}/${action}`;const r=await fetch((process.env.CMS_API_URL||"http://127.0.0.1:8080").replace(/\/$/,"")+uri,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+reviewToken(session.actor!.id,"POST",uri,process.env.CMS_APP_REVIEW_KEY||"")},body:JSON.stringify(body),cache:"no-store",signal:AbortSignal.timeout(45000)});const d=await r.json();if(!r.ok)throw Error(d.detail||"同步狀態保存失敗");return d;}
 return await exclusive(session,async()=>{try{await upstream(session,"short/drama/index?offset=0&limit=1");return await withProjectPublication(projectId,async()=>{const snapshot=await cms("sync-start",{});try{const result=await synchronizeProject({get:(route,html)=>upstream(session,route,undefined,html),post:(route,body)=>upstream(session,route,body)},snapshot as SyncSnapshot);const status=await cms("sync-finish",{revision:snapshot.revision,claim:snapshot.claim,success:true,message:""});return json({...result,...status});}catch(e){const message=e instanceof Error?e.message:"同步失敗";await cms("sync-finish",{revision:snapshot.revision,claim:snapshot.claim,success:false,message}).catch(()=>{});throw e;}});}finally{await persist(session);}});
 }catch(e){return json({message:e instanceof Error?e.message:"同步失敗"},e instanceof AdminError?e.status:409);}
}
