import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const APP_SESSION_COOKIE = "md_app_session";

export async function readAppToken(): Promise<string | null> {
  return (await cookies()).get(APP_SESSION_COOKIE)?.value ?? null;
}

export function setAppSession(response: NextResponse, token: string, expiresIn: number) {
  response.cookies.set(APP_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.min(Math.max(expiresIn, 60), 2_592_000),
  });
}

export function clearAppSession(response: NextResponse) {
  response.cookies.set(APP_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

