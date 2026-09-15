import { NextResponse } from "next/server";

import { parseAppUserResponse, withAbsoluteAvatar } from "@/lib/app-auth/response";
import { appAuthConfig } from "@/lib/app-auth/config";
import { clearAppSession, readAppToken } from "@/lib/app-auth/session";
import { callAppApi } from "@/lib/app-auth/upstream";

export async function GET() {
  const token = await readAppToken();
  if (!token) return NextResponse.json({ authenticated: false }, { status: 401 });
  try {
    const user = parseAppUserResponse(await callAppApi("/api/user/userInfo", { token, method: "GET" }));
    return NextResponse.json({ authenticated: true, user: withAbsoluteAvatar(user, appAuthConfig().baseUrl) });
  } catch {
    const response = NextResponse.json({ authenticated: false }, { status: 401 });
    clearAppSession(response);
    return response;
  }
}
