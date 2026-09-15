import "server-only";

import { appAuthConfig } from "./config";
import { parseAppLoginResponse } from "./response";
import type { AppAuthResult } from "./types";
import { callAppApi } from "./upstream";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function requiredString(value: unknown, message: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(message);
  return value.trim();
}

function decodeJwtPart(part: string): JsonRecord {
  const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as JsonRecord;
}

async function fetchJson(url: URL): Promise<JsonRecord> {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error("第三方身份驗證失敗");
  const value = await response.json();
  const record = asRecord(value);
  if (!record) throw new Error("第三方身份驗證失敗");
  return record;
}

export async function loginWithGoogle(credential: string, deviceId: string): Promise<AppAuthResult> {
  const { googleClientId } = appAuthConfig();
  if (!googleClientId) throw new Error("Google 登錄尚未配置");
  if (credential.length > 10_000) throw new Error("Google 登錄憑證無效");

  const url = new URL("https://oauth2.googleapis.com/tokeninfo");
  url.searchParams.set("id_token", credential);
  const profile = await fetchJson(url);
  const subject = requiredString(profile.sub, "Google 登錄憑證無效");
  const email = requiredString(profile.email, "Google 賬號未提供郵箱");
  const issuer = requiredString(profile.iss, "Google 登錄憑證無效");
  const expiresAt = Number(profile.exp);
  if (profile.aud !== googleClientId || !["accounts.google.com", "https://accounts.google.com"].includes(issuer)) {
    throw new Error("Google 登錄憑證不屬於本站");
  }
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) throw new Error("Google 登錄憑證已過期");
  if (profile.email_verified !== "true" && profile.email_verified !== true) throw new Error("Google 郵箱尚未驗證");

  return parseAppLoginResponse(await callAppApi("/api/user/googleAppLogin", {
    body: { email, unionid: subject, device_id: deviceId },
  }));
}

export async function loginWithFacebook(accessToken: string, deviceId: string): Promise<AppAuthResult> {
  const { facebookAppId, facebookAppSecret } = appAuthConfig();
  if (!facebookAppId || !facebookAppSecret) throw new Error("Facebook 登錄尚未配置");
  if (accessToken.length > 4_096) throw new Error("Facebook 登錄憑證無效");

  const debugUrl = new URL("https://graph.facebook.com/debug_token");
  debugUrl.searchParams.set("input_token", accessToken);
  debugUrl.searchParams.set("access_token", `${facebookAppId}|${facebookAppSecret}`);
  const debug = asRecord((await fetchJson(debugUrl)).data);
  const subject = requiredString(debug?.user_id, "Facebook 登錄憑證無效");
  if (debug?.is_valid !== true || debug?.app_id !== facebookAppId) throw new Error("Facebook 登錄憑證不屬於本站");

  const profileUrl = new URL("https://graph.facebook.com/me");
  profileUrl.searchParams.set("fields", "id,email");
  profileUrl.searchParams.set("access_token", accessToken);
  const profile = await fetchJson(profileUrl);
  const email = requiredString(profile.email, "Facebook 賬號未授權郵箱");
  if (profile.id !== subject) throw new Error("Facebook 登錄身份不一致");

  return parseAppLoginResponse(await callAppApi("/api/user/facebookLogin", {
    body: { email, unionid: subject, device_id: deviceId },
  }));
}

let appleKeys: { expiresAt: number; keys: JsonRecord[] } | null = null;

async function getAppleKey(kid: string): Promise<JsonRecord> {
  const now = Date.now();
  if (!appleKeys || appleKeys.expiresAt <= now) {
    const response = await fetchJson(new URL("https://appleid.apple.com/auth/keys"));
    const keys = Array.isArray(response.keys) ? response.keys.filter((item): item is JsonRecord => Boolean(asRecord(item))) : [];
    appleKeys = { expiresAt: now + 60 * 60_000, keys };
  }
  const key = appleKeys.keys.find((candidate) => candidate.kid === kid);
  if (!key) throw new Error("Apple 登錄簽名密鑰無效");
  return key;
}

async function verifyAppleIdentityToken(identityToken: string, expectedNonce?: string): Promise<JsonRecord> {
  const { appleClientId } = appAuthConfig();
  if (!appleClientId) throw new Error("Apple 登錄尚未配置");
  if (identityToken.length > 10_000) throw new Error("Apple 登錄憑證無效");
  const parts = identityToken.split(".");
  if (parts.length !== 3) throw new Error("Apple 登錄憑證無效");
  const header = decodeJwtPart(parts[0]);
  const payload = decodeJwtPart(parts[1]);
  const kid = requiredString(header.kid, "Apple 登錄憑證無效");
  if (header.alg !== "RS256") throw new Error("Apple 登錄簽名算法無效");

  const key = await crypto.subtle.importKey(
    "jwk",
    await getAppleKey(kid) as JsonWebKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signature = Buffer.from(parts[2].replace(/-/g, "+").replace(/_/g, "/"), "base64");
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    signature,
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!valid || payload.iss !== "https://appleid.apple.com" || !audience.includes(appleClientId)) {
    throw new Error("Apple 登錄憑證不屬於本站");
  }
  const expiresAt = Number(payload.exp);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) throw new Error("Apple 登錄憑證已過期");
  if (expectedNonce && payload.nonce !== expectedNonce) throw new Error("Apple 登錄隨機校驗失敗");
  return payload;
}

export async function loginWithApple(identityToken: string, deviceId: string, nonce?: string): Promise<AppAuthResult> {
  const payload = await verifyAppleIdentityToken(identityToken, nonce);
  const subject = requiredString(payload.sub, "Apple 登錄憑證無效");
  return parseAppLoginResponse(await callAppApi("/api/user/appleLogin", {
    body: { openid: subject, identity_token: identityToken, device_id: deviceId },
  }));
}

