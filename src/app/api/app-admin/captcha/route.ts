import { NextResponse } from "next/server";
import { state, exclusive, baseUrl, persist, AdminError, errorResponse } from "@/lib/app-admin/server";
export async function GET(){
  try{const s=await state();return await exclusive(s,async()=>{
    const target=new URL('/index.php?s=/captcha',baseUrl());
    const r=await fetch(target,{headers:{Cookie:Object.entries(s.jar).map(([k,v])=>`${k}=${v}`).join('; ')},redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(10_000)});
    const type=r.headers.get('content-type')??'';
    if(!r.ok||!/^image\/(png|jpeg|gif)/.test(type))throw new AdminError('驗證碼讀取失敗',502);
    const bytes=await r.arrayBuffer();if(bytes.byteLength>1024*1024)throw new AdminError('驗證碼返回異常',502);
    for(const cookie of r.headers.getSetCookie()){const pair=cookie.split(';',1)[0],i=pair.indexOf('=');if(i>0&&/^[\w-]+$/.test(pair.slice(0,i)))s.jar[pair.slice(0,i)]=pair.slice(i+1);}
    await persist(s);return new NextResponse(bytes,{headers:{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  });}catch(e){return errorResponse(e);}
}
