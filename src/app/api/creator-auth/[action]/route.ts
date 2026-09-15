import { NextRequest, NextResponse } from "next/server";
import { CreatorAuthError, clearCreatorSession, creatorAuthRequest, readCreatorToken, setCreatorSession } from "@/lib/creator-auth/server";
import type { CreatorAccount } from "@/lib/creator-auth/types";
import { clientAddress, consumeLoginAttempt, isAllowedOrigin } from "@/lib/app-auth/request-security";
import { callAppApi } from "@/lib/app-auth/upstream";
import { parseAppLoginResponse } from "@/lib/app-auth/response";

export const dynamic="force-dynamic";
type Context={params:Promise<{action:string}>};
const json=(value:unknown,status=200) => NextResponse.json(value,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(_request:NextRequest,context:Context) {
  if((await context.params).action !== "me") return json({message:"頁面不存在"},404);
  try {
    const token=await readCreatorToken();
    if(!token) return json({account:null},401);
    return json({account:await creatorAuthRequest<CreatorAccount>("me",token)});
  } catch(error) { return failure(error); }
}
export async function POST(request:NextRequest,context:Context) {
  const {action}=await context.params;
  if(!["login","register","logout","binding","unbind","sms"].includes(action)) return json({message:"頁面不存在"},404);
  if(!request.headers.get("origin") || !isAllowedOrigin(request)) return json({message:"請求來源無效"},403);
  if(!consumeLoginAttempt(`creator:${action}:${clientAddress(request)}`,Date.now(),action === "register" ? 5 : 12)) return json({message:"嘗試次數過多，請稍後重試"},429);
  if(action === "sms") return json({message:"短信驗證服務尚未開通，請使用密碼登錄或註冊",code:"SMS_NOT_CONFIGURED"},503);
  try {
    const token=await readCreatorToken();
    if(action === "logout") {
      if(token) await creatorAuthRequest("logout",token,{});
      const response=json({ok:true}); clearCreatorSession(response); return response;
    }
    const raw=await request.text();
    if(Buffer.byteLength(raw)>8192) return json({message:"請求內容過長"},413);
    const body=JSON.parse(raw) as Record<string,unknown>;
    if(!body || Array.isArray(body) || typeof body !== "object") return json({message:"請求格式不正確"},400);
    if(action === "login" || action === "register") {
      if(typeof body.account!=="string" || typeof body.password!=="string") return json({message:"請填寫賬號與密碼"},400);
      const result=await creatorAuthRequest<{token:string;expiresIn:number;account:CreatorAccount}>(action,null,{account:body.account,password:body.password,displayName:typeof body.displayName === "string" ? body.displayName : "",accepted:body.accepted === true});
      const response=json({ok:true,account:result.account});setCreatorSession(response,result.token,result.expiresIn);return response;
    }
    if(!token) return json({message:"請先登錄創作者賬號"},401);
    // Authenticate the creator before attempting any App login with submitted credentials.
    await creatorAuthRequest("me",token);
    if(action === "binding") {
      if(typeof body.account!=="string" || typeof body.password!=="string" || !body.account.trim() || body.account.length>120 || !body.password || body.password.length>256) return json({message:"請填寫 App 賬號與密碼"},400);
      let app;
      try { app=parseAppLoginResponse(await callAppApi("/api/user/login",{body:{account:body.account.trim(),password:body.password}})); }
      catch { return json({message:"App 賬號驗證失敗，請檢查密碼或稍後重試"},400); }
      const account=await creatorAuthRequest<CreatorAccount>("binding",token,{token:app.token,expiresIn:app.expiresIn});
      return json({ok:true,account});
    }
    return json({ok:true,account:await creatorAuthRequest<CreatorAccount>("unbind",token,{password:body.password})});
  } catch(error) {
    if(error instanceof SyntaxError) return json({message:"請求格式不正確"},400);
    return failure(error);
  }
}
function failure(error:unknown) {
  return json({message:error instanceof CreatorAuthError ? error.message : "操作失敗，請稍後重試",code:error instanceof CreatorAuthError ? error.code : "AUTH_ERROR"},error instanceof CreatorAuthError ? error.status : 503);
}
