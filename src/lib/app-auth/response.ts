import type { AppApiEnvelope, AppAuthResult, AppAuthUser } from "./types";

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function normalizeAppUser(value: unknown): AppAuthUser {
  const user = recordValue(value);
  if (!user) throw new Error("401 登錄響應缺少用戶資料");

  const id = numberValue(user.id, -1);
  if (id < 1) throw new Error("401 登錄響應缺少有效用戶 ID");

  return {
    id,
    username: stringValue(user.username) ?? `user_${id}`,
    email: stringValue(user.email),
    mobile: stringValue(user.mobile),
    avatar: stringValue(user.avatar),
    score: numberValue(user.score),
    money: numberValue(user.money),
    vipEndTime: user.vip_endtime == null ? null : numberValue(user.vip_endtime),
  };
}

export function withAbsoluteAvatar(user: AppAuthUser, baseUrl: string): AppAuthUser {
  if (!user.avatar || /^https?:\/\//i.test(user.avatar)) return user;
  try { return { ...user, avatar: new URL(user.avatar, `${baseUrl.replace(/\/+$/, "")}/`).toString() }; }
  catch { return { ...user, avatar: null }; }
}

export function parseAppLoginResponse(envelope: AppApiEnvelope): AppAuthResult {
  if (Number(envelope.code) !== 1) {
    throw new Error(stringValue(envelope.msg) ?? "登錄失敗");
  }
  const data = recordValue(envelope.data);
  const userinfo = recordValue(data?.userinfo);
  const token = stringValue(userinfo?.token);
  if (!token) throw new Error("401 登錄響應缺少 Token");

  return {
    token,
    expiresIn: Math.max(60, numberValue(userinfo?.expires_in, 2_592_000)),
    user: normalizeAppUser(userinfo),
  };
}

export function parseAppUserResponse(envelope: AppApiEnvelope): AppAuthUser {
  if (Number(envelope.code) !== 1) {
    throw new Error(stringValue(envelope.msg) ?? "登錄狀態已失效");
  }
  const data = recordValue(envelope.data);
  return normalizeAppUser(data?.userinfo ?? envelope.data);
}

export function publicErrorMessage(error: unknown, fallback = "請求失敗，請稍後重試"): string {
  if (!(error instanceof Error)) return fallback;
  const message = error.message.trim();
  if (!message || /token|upstream|fetch|json|401 登录响应/i.test(message)) return fallback;
  return message.slice(0, 120);
}
