import { NextRequest, NextResponse } from "next/server";

import { clientAddress, consumeLoginAttempt, isAllowedOrigin } from "@/lib/app-auth/request-security";
import { publicErrorMessage, withAbsoluteAvatar } from "@/lib/app-auth/response";
import { appAuthConfig, publicAuthProviders } from "@/lib/app-auth/config";
import { setAppSession } from "@/lib/app-auth/session";
import { loginWithApple, loginWithFacebook, loginWithGoogle } from "@/lib/app-auth/social";

export async function POST(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ ok: false, message: "請求來源無效" }, { status: 403 });
  const { provider } = await context.params;
  const providers = publicAuthProviders();
  if (provider !== "google" && provider !== "facebook" && provider !== "apple") return NextResponse.json({ ok: false, message: "不支持的登錄方式" }, { status: 404 });
  if (!providers[provider]) return NextResponse.json({ ok: false, message: "此登錄方式尚未完成配置，請先使用賬號密碼登錄" }, { status: 503 });
  if (!consumeLoginAttempt(`social:${provider}:${clientAddress(request)}`, Date.now(), 20)) {
    return NextResponse.json({ ok: false, message: "嘗試次數過多，請稍後再試" }, { status: 429 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const deviceId = typeof body.deviceId === "string" && body.deviceId.length <= 120 ? body.deviceId : "web";
    const result = provider === "google"
      ? await loginWithGoogle(String(body.credential ?? ""), deviceId)
      : provider === "facebook"
        ? await loginWithFacebook(String(body.accessToken ?? ""), deviceId)
        : provider === "apple"
          ? await loginWithApple(String(body.identityToken ?? ""), deviceId, typeof body.nonce === "string" ? body.nonce : undefined)
          : null;
    if (!result) return NextResponse.json({ ok: false, message: "不支持的登錄方式" }, { status: 404 });
    const response = NextResponse.json({ ok: true, user: withAbsoluteAvatar(result.user, appAuthConfig().baseUrl) });
    setAppSession(response, result.token, result.expiresIn);
    return response;
  } catch (error) {
    return NextResponse.json({ ok: false, message: publicErrorMessage(error, "第三方登錄失敗") }, { status: 401 });
  }
}
