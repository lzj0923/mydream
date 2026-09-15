import { NextRequest, NextResponse } from "next/server";
import { clientAddress, consumeLoginAttempt, isAllowedOrigin } from "@/lib/app-auth/request-security";
import { registrationFields, registerAppAccount } from "@/lib/app-auth/registration";
import { publicErrorMessage } from "@/lib/app-auth/response";
import { callAppApi } from "@/lib/app-auth/upstream";

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ ok: false, message: "請求來源無效" }, { status: 403 });
  if (!consumeLoginAttempt(`register:${clientAddress(request)}`)) return NextResponse.json({ ok: false, message: "嘗試次數過多，請稍後再試" }, { status: 429 });
  let fields: Record<string, string>;
  try { fields = registrationFields(await request.json()); }
  catch (error) { return NextResponse.json({ ok: false, message: publicErrorMessage(error, "請檢查註冊信息") }, { status: 400 }); }
  try {
    await registerAppAccount(fields, callAppApi);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: publicErrorMessage(error, "註冊服務暫時不可用，請稍後重試") }, { status: 400 });
  }
}
