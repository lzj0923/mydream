import "server-only";
import {assertAppAccess} from "./access-error";

import { appAuthConfig } from "./config";
import type { AppApiEnvelope } from "./types";

const REQUEST_TIMEOUT_MS = 12_000;

export async function callAppApi(
  path: string,
  options: { body?: Record<string, string>; token?: string; method?: "GET" | "POST" } = {},
): Promise<AppApiEnvelope> {
  if (!path.startsWith("/api/")) throw new Error("非法的 401 API 路徑");
  const { baseUrl } = appAuthConfig();
  const method = options.method ?? "POST";
  const headers = new Headers({ "Accept-Language": "zh-cn", Accept: "application/json" });
  if (options.token) headers.set("token", options.token);
  let body: URLSearchParams | undefined;
  if (options.body) {
    headers.set("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8");
    body = new URLSearchParams(options.body);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: method === "POST" ? body : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  assertAppAccess(undefined,response.status);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) throw new Error("401 登錄服務返回異常");
  const envelope = await response.json() as AppApiEnvelope;
  assertAppAccess(envelope.code,response.status);
  if (!response.ok && Number(envelope.code) !== 0) {
    throw new Error(typeof envelope.msg === "string" ? envelope.msg : "401 登錄服務暫時不可用");
  }
  return envelope;
}

