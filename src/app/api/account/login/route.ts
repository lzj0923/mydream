import { NextRequest, NextResponse } from "next/server";

import { clientAddress, consumeLoginAttempt, isAllowedOrigin } from "@/lib/app-auth/request-security";
import { parseAppLoginResponse, publicErrorMessage, withAbsoluteAvatar } from "@/lib/app-auth/response";
import { appAuthConfig } from "@/lib/app-auth/config";
import { setAppSession } from "@/lib/app-auth/session";
import { callAppApi } from "@/lib/app-auth/upstream";

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ ok: false, message: "請求來源無效" }, { status: 403 });
  const address = clientAddress(request);
  if (!consumeLoginAttempt(`password:${address}`)) {
    return NextResponse.json({ ok: false, message: "嘗試次數過多，請稍後再試" }, { status: 429 });
  }

  try {
    const body = await request.json() as { account?: unknown; password?: unknown };
    const account = typeof body.account === "string" ? body.account.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!account || account.length > 120 || !password || password.length > 256) {
      return NextResponse.json({ ok: false, message: "請輸入正確的賬號和密碼" }, { status: 400 });
    }
    const result = parseAppLoginResponse(await callAppApi("/api/user/login", { body: { account, password } }));
    const response = NextResponse.json({ ok: true, user: withAbsoluteAvatar(result.user, appAuthConfig().baseUrl) });
    setAppSession(response, result.token, result.expiresIn);
    return response;
  } catch (error) {
    return NextResponse.json({ ok: false, message: publicErrorMessage(error, "賬號或密碼不正確") }, { status: 401 });
  }
}
