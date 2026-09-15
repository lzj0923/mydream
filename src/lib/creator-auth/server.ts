import "server-only";
import { secureSessionCookie } from "../app-auth/request-security";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { Verification } from "./verification";

export const CREATOR_SESSION_COOKIE = "md_creator_session";
export class CreatorAuthError extends Error {
  constructor(message: string, public status = 503, public code = "CREATOR_AUTH_ERROR") { super(message); }
}
export async function readCreatorToken() {
  return (await cookies()).get(CREATOR_SESSION_COOKIE)?.value ?? null;
}
export function setCreatorSession(response: NextResponse, token: string, expiresIn: number) {
  response.cookies.set(CREATOR_SESSION_COOKIE,token,{httpOnly:true,secure:secureSessionCookie(),sameSite:"lax",path:"/",maxAge:Math.min(Math.max(expiresIn,0),604800)});
}
export function clearCreatorSession(response: NextResponse) { setCreatorSession(response,"",0); }
export async function creatorAuthRequest<T>(action: string, token: string | null, body?: unknown): Promise<T> {
  const base=(process.env.CMS_API_URL?.trim() || "http://127.0.0.1:8080").replace(/\/$/,"");
  try {
    const response=await fetch(`${base}/creator-api/v1/auth/${action}`,{method:body === undefined ? "GET" : "POST",headers:{"Content-Type":"application/json",...(action.startsWith("app-session")?{"X-Creator-Server-Key":process.env.CMS_APP_REVIEW_KEY||""}:{}),...(token ? {Authorization:`Bearer ${token}`} : {})},body:body === undefined ? undefined : JSON.stringify(body),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(25000)});
    const result=await response.json();
    if(!response.ok) throw new CreatorAuthError(result.detail || "創作者賬號服務暫時不可用",response.status,result.code);
    return result as T;
  } catch(error) {
    if(error instanceof CreatorAuthError) throw error;
    throw new CreatorAuthError("創作者賬號服務暫時無法連接，請稍後重試");
  }
}
export async function requireCreatorAppSession(purpose: "" | "UPLOAD" | "SUBMIT" | "TRAFFIC" | "TRAFFIC_EXPORT" = ""): Promise<{ token: string; userId: number }> {
  const creatorToken=await readCreatorToken();
  if(!creatorToken) throw new CreatorAuthError("請先登錄創作者賬號",401);
  return creatorAuthRequest(`app-session${purpose?`?purpose=${purpose}`:""}`,creatorToken);
}
export async function creatorVerification(token: string): Promise<Verification> {
  const base=(process.env.CMS_API_URL?.trim() || "http://127.0.0.1:8080").replace(/\/$/, "");
  const response=await fetch(`${base}/creator-api/v1/verification`, {headers:{Authorization:`Bearer ${token}`},cache:"no-store",signal:AbortSignal.timeout(15000)});
  if(!response.ok) throw new CreatorAuthError("身份認證服務暫時不可用",response.status);
  return response.json();
}
