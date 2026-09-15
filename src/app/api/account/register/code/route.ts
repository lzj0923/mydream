import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { clientAddress, consumeLoginAttempt, isAllowedOrigin } from "@/lib/app-auth/request-security";
import { registrationEmail } from "@/lib/app-auth/registration";
import { publicErrorMessage } from "@/lib/app-auth/response";
import { callAppApi } from "@/lib/app-auth/upstream";

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ ok: false, message: "請求來源無效" }, { status: 403 });
  let email: string;
  try { email = registrationEmail((await request.json())?.email); }
  catch { return NextResponse.json({ ok: false, message: "請輸入正確的郵箱地址" }, { status: 400 }); }
  const key = createHash("sha256").update(email.toLowerCase()).digest("hex");
  if (!consumeLoginAttempt(`register-code-ip:${clientAddress(request)}`, Date.now(), 5)
    || !consumeLoginAttempt(`register-code-email:${key}`, Date.now(), 1, 60_000)) {
    return NextResponse.json({ ok: false, message: "驗證碼發送頻繁，請稍後再試" }, { status: 429 });
  }
  try {
    const result = await callAppApi(`/api/user/sendemail?${new URLSearchParams({ email })}`, { method: "GET" });
    if (Number(result.code) !== 1) throw new Error(typeof result.msg === "string" ? result.msg : "驗證碼發送失敗");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: publicErrorMessage(error, "驗證碼發送失敗，請稍後重試") }, { status: 400 });
  }
}
