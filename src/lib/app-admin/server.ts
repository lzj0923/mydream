import "server-only";
import { secureSessionCookie } from "../app-auth/request-security";
import { applyUpstreamCookies, repairLegacyAuthCookies } from "./cookies";
import { randomBytes, createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import { withSessionLock, SessionLockError } from "./session-lock";
import path from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { formToken, record, modules, projectRow, type Module, type Row } from "./domain";

export const COOKIE = "md_app_admin";
export type State = { id: string; jar: Record<string,string>; token: string; expires: number; actor?: { id: number; username: string }; captcha: boolean };
const directory = () => process.env.APP_ADMIN_STATE_DIR || path.join(process.cwd(), ".data", "app-admin");
export class AdminError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function baseUrl() {
  const url = new URL(process.env.APP_ADMIN_URL || "https://share.the-drama-has-a-plot.com/Admin2025.php");
  if (url.username || url.password || !["https:", ...(process.env.APP_ADMIN_ALLOW_LOCAL === "true" && ["127.0.0.1", "localhost"].includes(url.hostname) ? ["http:"] : [])].includes(url.protocol)) throw new AdminError("App 後台地址配置無效", 503);
  return url.href.replace(/\/$/, "");
}
export async function state(create = false): Promise<State> {
  const id = (await cookies()).get(COOKIE)?.value;
  if (id && /^[a-f0-9]{64}$/.test(id)) {
    try { const value = JSON.parse(await readFile(path.join(directory(), id+".json"), "utf8")) as State;
      if (value.expires > Date.now()) return value;
    } catch { /* expired or missing session */ }
  }
  if (!create) throw new AdminError("請使用 App 管理員賬號登錄", 401);
  return { id: randomBytes(32).toString("hex"), jar: {}, token: "", expires: Date.now()+30*60_000, captcha: false };
}
export async function persist(value: State) {
  await mkdir(directory(), { recursive: true, mode: 0o700 });
  const target = path.join(directory(), value.id+".json"), temp=target+"."+randomBytes(6).toString("hex");
  await writeFile(temp, JSON.stringify(value), { mode: 0o600 }); await rename(temp,target);
}
export async function discard(value: State) { await unlink(path.join(directory(),value.id+".json")).catch(()=>undefined); }
export function response(value: State, body: unknown, status = 200) {
  const r=NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
  r.cookies.set(COOKIE,value.id,{httpOnly:true,secure:secureSessionCookie(),sameSite:"strict",path:"/",maxAge:Math.max(0,Math.floor((value.expires-Date.now())/1000))});return r;
}
export async function exclusive<T>(value: State, action:()=>Promise<T>) {
  try{return await withSessionLock(directory(),value,action);}
  catch(e){if(e instanceof SessionLockError)throw new AdminError(e.message,e.status);throw e;}
}
export async function upstream(value: State, route: string, body?: URLSearchParams, html = false) {
  repairLegacyAuthCookies(value.jar);
  const target = new URL(baseUrl()+"/"+route);
  const headers: Record<string,string>={ Cookie:Object.entries(value.jar).map(([k,v])=>`${k}=${v}`).join("; "),Referer:baseUrl()+"/index/index" };
  if (!html) headers["X-Requested-With"]="XMLHttpRequest";
  if (body) headers["Content-Type"]="application/x-www-form-urlencoded";
  let r: Response;
  try { r=await fetch(target,{method:body?"POST":"GET",headers,body,cache:"no-store",redirect:"manual",signal:AbortSignal.timeout(20_000)}); }
  catch { throw new AdminError(body ? "App 後台響應中斷，請刷新核對結果後再操作" : "App 後台暫時無法連接",502); }
  applyUpstreamCookies(value.jar, r.headers.getSetCookie());
  if (r.status>=300 && r.status<400) {value.actor=undefined;await persist(value);throw new AdminError("App 管理員會話已失效，請重新登錄",401);}
  if (!r.ok) throw new AdminError("App 後台請求失敗",502);
  const text=await r.text();
  if(html) return text;
  let data: Record<string,unknown>;
  try {data=record(JSON.parse(text));}catch{throw new AdminError("App 後台未返回管理接口數據，請重新登錄",401);}
  if(Object.hasOwn(data,"code") && Number(data.code)!==1){
    const msg=String(data.msg??"");
    if(/login|登录|登入/i.test(msg)){value.actor=undefined;await persist(value);throw new AdminError("App 管理員會話已失效，請重新登錄",401);}
    if(/permission|权限|權限/i.test(msg)) throw new AdminError("該 App 管理員沒有此操作權限",403);
    throw new AdminError(/password|username|密码|用户名|帳號|密碼/i.test(msg)?"App 管理員賬號或密碼不正確":"App 後台拒絕操作，請檢查填寫內容或在原後台核對",400);
  }
  return data;
}
export async function prepare(value: State) {
  const html=await upstream(value,"index/login",undefined,true) as string;
  value.token=formToken(html);value.captcha=/name\s*=\s*["']captcha["']/i.test(html);
  if(!value.token) throw new AdminError("無法讀取 App 管理員登錄表單",502);
}
export function authenticated(value: State) { if(!value.actor) throw new AdminError("請使用 App 管理員賬號登錄",401); }
export function revision(raw: unknown) {return createHash("sha256").update(JSON.stringify(raw)).digest("hex");}
export async function list(value: State, key: Module, page: number, search: string, id?: string) {
  authenticated(value);
  const q=new URLSearchParams({offset:String((page-1)*20),limit:"20",page:String(page),sort:"id",order:"desc",search});
  if(id){q.set("filter",JSON.stringify({id}));q.set("op",JSON.stringify({id:"="}));}
  const result=await upstream(value,modules[key].path+"/index?"+q) as Record<string,unknown>;
  if(!Array.isArray(result.rows)) throw new AdminError("App 列表格式異常",502);
  return {total:Number(result.total)||0,rows:result.rows.map((raw): Row & {revision: string} =>({...projectRow(key,raw),revision:revision(raw)})),raw:result.rows};
}
export function errorResponse(error: unknown) {return NextResponse.json({message:error instanceof AdminError?error.message:"操作失敗，請檢查輸入後重試"},{status:error instanceof AdminError?error.status:400,headers:{"Cache-Control":"no-store"}});}

