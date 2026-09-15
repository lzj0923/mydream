import "server-only";
import { readCreatorToken } from "@/lib/creator-auth/server";
import { VideoApiError } from "./server";

export async function projectRequest<T>(_token: string, path: string, body?: unknown): Promise<T> {
  const creatorToken = await readCreatorToken();
  if (!creatorToken) throw new VideoApiError("請先登錄創作者賬號", 401);
  const base = (process.env.CMS_API_URL?.trim() || "http://127.0.0.1:8080").replace(/\/$/, "");
  const response = await fetch(`${base}/creator-api/v1/${path}`, {
    method: body===undefined?"GET":"POST", headers: { Authorization: `Bearer ${creatorToken}`, "Content-Type": "application/json" },
    body: body===undefined?undefined:JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(30000), redirect: "error",
  });
  const result = await response.json();
  if (!response.ok) throw new VideoApiError(result.detail || "項目服務暫時不可用", response.status, typeof result.code === "string" ? result.code : "VIDEO_ERROR");
  return result;
}
