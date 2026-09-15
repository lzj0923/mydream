import { NextRequest, NextResponse } from "next/server";

import { isAllowedOrigin } from "@/lib/app-auth/request-security";
import { clearAppSession, readAppToken } from "@/lib/app-auth/session";
import { callAppApi } from "@/lib/app-auth/upstream";

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ ok: false }, { status: 403 });
  const token = await readAppToken();
  if (token) {
    try { await callAppApi("/api/user/logout", { token }); } catch { /* local logout still succeeds */ }
  }
  const response = NextResponse.json({ ok: true });
  clearAppSession(response);
  return response;
}

