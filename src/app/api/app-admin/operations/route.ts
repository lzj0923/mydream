import {reviewToken} from "@/lib/app-admin/review-token";
import {NextRequest,NextResponse} from "next/server";
import {state,authenticated,exclusive,upstream,persist,AdminError,errorResponse} from "@/lib/app-admin/server";
import {record} from "@/lib/app-admin/domain";
import {isAllowedOrigin} from "@/lib/app-auth/request-security";
const json=(data:unknown)=>NextResponse.json(data,{headers:{"Cache-Control":"no-store"}});
export async function GET(request:NextRequest){try{
 const s=await state();authenticated(s);
 return await exclusive(s,async()=>{try{
  const finance=request.nextUrl.searchParams.get("view")==="withdrawals";
  if(!finance){
   await upstream(s,"short/drama/index?offset=0&limit=1");
   const uri="/creator-api/v1/project-reviews/operations";
   const r=await fetch((process.env.CMS_API_URL||"http://127.0.0.1:8080")+uri,{headers:{Authorization:"Bearer "+reviewToken(s.actor!.id,"GET",uri,process.env.CMS_APP_REVIEW_KEY||"")},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(12000)});
   if(!r.ok)throw new AdminError("創作者操作記錄暫不可用",r.status);
   const value=await r.json();if(!Array.isArray(value))throw new AdminError("操作記錄格式異常",502);
   const entity=request.nextUrl.searchParams.get("entity")||"",id=request.nextUrl.searchParams.get("id")||"";
   const rows=value.map(record).filter(row=>(!entity||row.entity_type===entity)&&(!id||String(row.entity_id)===id));
   const page=Math.floor(Math.max(1,Math.min(10000,Number(request.nextUrl.searchParams.get("page"))||1)));
   return json({rows:rows.slice((page-1)*20,page*20),total:rows.length,limited:value.length===500});
  }
  const page=Math.max(1,Math.min(10000,Number(request.nextUrl.searchParams.get("page"))||1));
  const q=new URLSearchParams({offset:String((Math.floor(page)-1)*20),limit:"20",sort:"id",order:"desc"});
  const data=record(await upstream(s,"recharge/withdrawal/index?"+q));
  const rows=(Array.isArray(data.rows)?data.rows:[]).map(value=>{const row=record(value);return {
   id:row.id,user:row.user,amount:row.amount,actual_amount:row.actual_amount,status:row.status,reason:row.reason,
   created_at:row.created_at,
  };});
  return json({rows,total:Number(data.total)||0,page});
 }finally{await persist(s);}});
 }catch(e){return errorResponse(e);}}
export async function POST(request:NextRequest){
 if(!isAllowedOrigin(request))return errorResponse(new AdminError("請求來源無效",403));
 try{const s=await state();authenticated(s);return errorResponse(new AdminError("請到 App 原管理後台審核與登記付款結果",405));}
 catch(e){return errorResponse(e);}
}
