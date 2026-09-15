import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { safeCreatorReturn } from "../src/lib/creator-auth/types.ts";
import { isAllowedOrigin, secureSessionCookie } from "../src/lib/app-auth/request-security.ts";
import { isReviewRoute, isCreatorRoute } from "../src/lib/creator-review-access.ts";

test("certification review routes require CMS credentials and do not accept arbitrary actions",()=>{
  for(const path of ["verification-reviews","verification-reviews/item-a"]){assert.equal(isCreatorRoute(path),true);assert.equal(isReviewRoute(path),true);}
  for(const path of ["verification","verification/check"]){assert.equal(isCreatorRoute(path),true);assert.equal(isReviewRoute(path),false);}
  for(const path of ["verification-reviews/item-a/approve","verification/other-account","verification/../admin"]){assert.equal(isCreatorRoute(path),false);}
});

test("creator return URL never leaves the protected workspace", () => {
  assert.equal(safeCreatorReturn("/creator/workspace#videos"), "/creator/workspace#videos");
  for (const url of [null,"https://evil.test","//evil.test","/creator/workspace/../../admin","/creator/workspace\\evil","/admin"]) assert.equal(safeCreatorReturn(url), "/creator/workspace");
});
test("loopback origin aliases are allowed only in development on the same port and protocol", () => {
  const req = (origin: string) => new Request("http://localhost:3000/api/creator-auth/register", { headers: { origin } });
  assert.equal(isAllowedOrigin(req("http://127.0.0.1:3000"), "", "development"), true);
  assert.equal(isAllowedOrigin(req("http://127.0.0.1:3000"), "", "production"), false);
  for (const origin of ["http://127.0.0.1:3001","https://127.0.0.1:3000","http://evil.test:3000"]) assert.equal(isAllowedOrigin(req(origin), "", "development"), false);
});
test("workspace checks the backend session, redirects missing or expired sessions, and fails closed on outages", async () => {
  class AuthError extends Error { status: number; constructor(status: number) { super("auth"); this.status=status; } }
  let token: string | null = null, status = 200, calls = 0, certification = "PENDING";
  const exports: { default?: (props: {children:string})=>Promise<string> } = {};
  const compiled=ts.transpileModule(readFileSync("src/app/(creator)/creator/workspace/layout.tsx","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  runInNewContext(compiled,{exports,require:(name:string)=>{
    if(name === "next/navigation")return {redirect:(url:string)=>{throw new Error(`redirect:${url}`);}};
    if(name === "@/lib/creator-auth/server")return {creatorVerification:async()=>({state:certification}),CreatorAuthError:AuthError,readCreatorToken:async()=>token,creatorAuthRequest:async()=>{calls++;if(status!==200)throw new AuthError(status);return {};}};
    throw new Error(name);
  }});
  const render=()=>exports.default!({children:"private workspace"});
  await assert.rejects(render,/redirect:\/creator\/login/);assert.equal(calls,0);
  token="forged";status=401;await assert.rejects(render,/redirect:\/creator\/login/);assert.equal(calls,1);
  status=503;await assert.rejects(render,e=>e instanceof AuthError && e.status===503);
  token="valid";status=200;assert.equal(await render(),"private workspace");
  certification="NONE";await assert.rejects(render,/redirect:\/creator\/verification/);
  for(const state of ["PENDING","REJECTED","APPROVED"]){certification=state;assert.equal(await render(),"private workspace");}
});


test("local production preview accepts loopback aliases only when explicitly enabled", () => {
  const request=(origin:string,url="http://localhost:3000/api/creator/projects")=>new Request(url,{headers:{origin}});
  assert.equal(isAllowedOrigin(request("http://127.0.0.1:3000"),"","production",true),true);
  assert.equal(isAllowedOrigin(request("http://[::1]:3000"),"","production",true),true);
  assert.equal(isAllowedOrigin(request("http://127.0.0.1:3000"),"","production",false),false);
  for(const origin of ["http://127.0.0.1:3001","https://127.0.0.1:3000","http://evil.test:3000"]){
    assert.equal(isAllowedOrigin(request(origin),"","production",true),false);
  }
  assert.equal(isAllowedOrigin(request("http://127.0.0.1:3000","https://official.mydream.tw/api/creator/projects"),"","production",true),false);
});

test("HTTP preview cookies work locally while production cookies remain secure",()=>{
 assert.equal(secureSessionCookie("production",false),true);
 assert.equal(secureSessionCookie("production",true),false);
 assert.equal(secureSessionCookie("development",false),false);
});
