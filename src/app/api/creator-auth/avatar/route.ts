import {NextRequest,NextResponse} from "next/server";
import {CreatorAuthError,readCreatorToken,creatorAuthRequest} from "@/lib/creator-auth/server";
import type {CreatorAccount} from "@/lib/creator-auth/types";
import {isAllowedOrigin,consumeLoginAttempt} from "@/lib/app-auth/request-security";
import {MAX_AVATAR_BYTES,readAvatar,saveAvatar} from "@/lib/creator-auth/avatar-store";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};
async function actor(){const token=await readCreatorToken();if(!token)throw new CreatorAuthError("請先登錄",401);return {token,account:await creatorAuthRequest<CreatorAccount>("me",token)};}
function failure(e:unknown){return NextResponse.json({message:e instanceof CreatorAuthError?e.message:"頭像處理失敗，請使用有效的 JPG、PNG 或 WebP 圖片重試"},{status:e instanceof CreatorAuthError?e.status:400,headers});}
export async function GET(request:NextRequest){try{
 const {token,account}=await actor();let id=account.id;
 if(request.nextUrl.searchParams.get("scope")==="current"){
  const base=(process.env.CMS_API_URL||"http://127.0.0.1:8080").replace(/\/$/,"");
  const r=await fetch(`${base}/creator-api/v1/team`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new CreatorAuthError("賬號身份讀取失敗",r.status);const team=await r.json();if(team.unavailable)throw new CreatorAuthError("賬號權限已變更",403);id=team.ownerId||id;
 }
 const bytes=await readAvatar(id);return bytes?new NextResponse(new Uint8Array(bytes),{headers:{...headers,"Content-Type":"image/webp"}}):new NextResponse(null,{status:204,headers});
 }catch(e){return failure(e);}}
export async function POST(request:NextRequest){
 if(!request.headers.get("origin")||!isAllowedOrigin(request))return NextResponse.json({message:"請求來源無效"},{status:403,headers});
 try{const {account}=await actor();if(!consumeLoginAttempt(`avatar:${account.id}`,Date.now(),12))throw new CreatorAuthError("修改過於頻繁，請稍後重試",429);
 if(!request.body)throw new CreatorAuthError("請選擇圖片",400);const reader=request.body.getReader(),chunks:Uint8Array[]=[];let total=0;
 while(true){const {value,done}=await reader.read();if(done)break;total+=value.length;if(total>MAX_AVATAR_BYTES){await reader.cancel();throw new CreatorAuthError("圖片不能超過 5 MB",413);}chunks.push(value);}
 await saveAvatar(account.id,Buffer.concat(chunks));return NextResponse.json({ok:true},{headers});
 }catch(e){return failure(e);}}
