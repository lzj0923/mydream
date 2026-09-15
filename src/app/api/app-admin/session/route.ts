import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { isAllowedOrigin, consumeLoginAttempt, clientAddress } from "@/lib/app-auth/request-security";
import { record } from "@/lib/app-admin/domain";
import { state, persist, prepare, response, upstream, discard, exclusive, AdminError, errorResponse, baseUrl } from "@/lib/app-admin/server";
export async function GET() {
  try {const s=await state(true); if(!s.actor) await exclusive(s,async()=>{await prepare(s);await persist(s);});
    return response(s,{user:s.actor??null,captcha:s.captcha,originalUrl:baseUrl()+"/index/index"});
  }catch(e){return errorResponse(e);}
}
export async function POST(request: NextRequest) {
  if(!isAllowedOrigin(request))return errorResponse(new AdminError("請求來源無效",403));
  try {
    if(Number(request.headers.get("content-length"))>4096)throw new AdminError("請求過大");
    const body=record(await request.json());
    // Login creates an anonymous handshake; only logout requires an existing session.
    const s=await state(body.action!=="logout");
    if(body.action==="logout") {await exclusive(s,async()=>{try{await upstream(s,"index/logout",new URLSearchParams({__token__:s.token}));}finally{await discard(s);}});s.expires=0;return response(s,{ok:true});}
    if(!consumeLoginAttempt("app-admin:"+clientAddress(request),Date.now(),5))throw new AdminError("登錄嘗試過於頻繁，請稍後重試",429);
    const username=String(body.username??""),password=String(body.password??"");
    if(username.length<3||username.length>30||password.length<3||password.length>30)throw new AdminError("請填寫有效的 App 管理員賬號和密碼");
    return await exclusive(s,async()=>{
      try{
        // The App PHP session can expire before the website session. Refresh its form before submitting credentials.
        await prepare(s);
        const result=await upstream(s,"index/login",new URLSearchParams({username,password,__token__:s.token,keeplogin:"0",captcha:String(body.captcha??"")})) as Record<string,unknown>;
        const actor=record(result.data);
        if(!Number(actor.id))throw new AdminError("App 管理員登錄返回異常",502);
        await discard(s);s.id=randomBytes(32).toString("hex");s.actor={id:Number(actor.id),username:String(actor.username??username)};s.expires=Date.now()+8*3600_000;
        await persist(s);return response(s,{user:s.actor});
      }catch(e){s.actor=undefined;try{await prepare(s);}catch{}await persist(s);return response(s,{message:e instanceof AdminError?e.message:"App 登錄暫時失敗，請稍後重試"},e instanceof AdminError?e.status:502);}
    });
  }catch(e){return errorResponse(e);}
}

