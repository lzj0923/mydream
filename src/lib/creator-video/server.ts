import "server-only";
import {AppAccessError,assertAppAccess} from "../app-auth/access-error";
import {videoConnectionFailure} from "./access-state";
import { callAppApi } from "@/lib/app-auth/upstream";
import { parseAppUserResponse } from "@/lib/app-auth/response";
import { CreatorAuthError, requireCreatorAppSession } from "@/lib/creator-auth/server";
import { record } from "./domain";
import type { AppApiEnvelope } from "@/lib/app-auth/types";

export class VideoApiError extends Error { constructor(message: string, public status = 400, public code = "VIDEO_ERROR") { super(message); } }
export async function videoViewer(purpose: "" | "UPLOAD" | "SUBMIT" | "TRAFFIC" | "TRAFFIC_EXPORT" = "") {
  try {
    const { token, userId } = await requireCreatorAppSession(purpose);
    const user = parseAppUserResponse(await callAppApi("/api/user/userInfo", { token, method: "GET" }));
    if (String(user.id) !== String(userId)) throw new VideoApiError("App 返回的賬號與綁定記錄不一致，請聯繫平台核對。", 409,"APP_BINDING_MISMATCH");
    return { token, user };
  } catch (error) {
    if (error instanceof CreatorAuthError || error instanceof AppAccessError) throw new VideoApiError(error.message, error.status,error.code);
    if (error instanceof VideoApiError) throw error;
    throw new VideoApiError(videoConnectionFailure.message,videoConnectionFailure.status,videoConnectionFailure.code);
  }
}
export function appData(envelope: AppApiEnvelope): unknown {
  assertAppAccess(envelope.code);
  if (Number(envelope.code) !== 1) throw new VideoApiError(typeof envelope.msg === "string" ? envelope.msg : "App 視頻服務暫時不可用");
  return envelope.data;
}
export function uploadCredentials(value: unknown) {
  const data = record(value);
  if (typeof data.UploadAuth !== "string" || typeof data.UploadAddress !== "string" || !/^[a-zA-Z0-9-]{16,80}$/.test(String(data.VideoId ?? ""))) throw new Error("上傳授權返回異常");
  const address = record(JSON.parse(Buffer.from(data.UploadAddress, "base64").toString("utf8")));
  const endpoint = String(address.Endpoint ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const match = /^oss-([a-z0-9-]+)\.aliyuncs\.com$/.exec(endpoint);
  if (!match || !/^[a-z0-9-]{3,63}$/.test(String(address.Bucket ?? "")) || typeof address.FileName !== "string") throw new Error("上傳地址無效");
  return { uploadAuth: data.UploadAuth, uploadAddress: data.UploadAddress, videoId: String(data.VideoId), region: match[1] };
}
