import type { AppApiEnvelope } from "./types";

export function registrationEmail(value: unknown): string {
  const email = typeof value === "string" ? value.trim() : "";
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("請輸入正確的郵箱地址");
  return email;
}

export function registrationFields(value: unknown): Record<string, string> {
  const body = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const email = registrationEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^\S{6,30}$/.test(password)) throw new Error("密碼須為 6–30 個字符，不能包含空格");
  if (password !== body.confirmPassword) throw new Error("兩次輸入的密碼不一致");
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^[a-zA-Z0-9]{4,12}$/.test(code)) throw new Error("請輸入正確的郵箱驗證碼");
  const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
  if (!/^web-[a-zA-Z0-9-]{16,64}$/.test(deviceId)) throw new Error("請刷新頁面後重試");
  const inviteCode = typeof body.inviteCode === "string" ? body.inviteCode.trim() : "";
  if (inviteCode && !/^[a-zA-Z0-9_-]{1,40}$/.test(inviteCode)) throw new Error("邀請碼格式不正確");
  return { email, password, code, device_id: deviceId, invite_code: inviteCode };
}

type RegisterApi = (path: string, options: { body: Record<string, string> }) => Promise<AppApiEnvelope>;

export async function registerAppAccount(fields: Record<string, string>, callApi: RegisterApi): Promise<void> {
  const result = await callApi("/api/user/emailregister", { body: fields });
  if (Number(result.code) !== 1) throw new Error(typeof result.msg === "string" ? result.msg : "註冊失敗，請稍後重試");
}

export function safeAccountNext(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !/[\\\x00-\x1f]/.test(value) ? value : "/account";
}
