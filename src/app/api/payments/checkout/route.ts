import { NextResponse } from "next/server";
import { readAppToken } from "@/lib/app-auth/session";
import { callAppApi } from "@/lib/app-auth/upstream";
import { consumeLoginAttempt, isAllowedOrigin } from "@/lib/app-auth/request-security";
import { parseCheckout } from "@/lib/payments/checkout";

export async function POST(request: Request) {
  if (!request.headers.get("origin") || !isAllowedOrigin(request)) return NextResponse.json({ message: "請從本站發起付款" }, { status: 403 });
  const token = await readAppToken();
  if (!token) return NextResponse.json({ message: "請先登入" }, { status: 401 });
  if (!consumeLoginAttempt(`payment:${token}`, Date.now(), 8, 60_000)) return NextResponse.json({ message: "操作過於頻繁，請稍後再試" }, { status: 429 });
  let input;
  try { input = await request.json(); } catch { return NextResponse.json({ message: "無效的訂單資料" }, { status: 400 }); }
  if (!input || !/^(coins-(500|700|1500|2500)|vip-(7|30|90|365))$/.test(input.productId)
    || !Number.isSafeInteger(input.expectedPrice) || input.expectedPrice <= 0) return NextResponse.json({ message: "無效的方案" }, { status: 400 });
  try {
    if (input.testKey !== undefined && (typeof input.testKey !== 'string' || !/^[a-f0-9]{64}$/.test(input.testKey))) return NextResponse.json({ message: "測試通道無效" }, { status: 400 });
    const result = await callAppApi("/api/newebpay/checkout", { token, body: { productId: input.productId, expectedPrice: String(input.expectedPrice), ...(input.testKey ? { testKey: input.testKey } : {}) } });
    if (Number(result.code) !== 1) return NextResponse.json({ message: "暫時無法建立付款，請確認登入狀態或稍後再試" }, { status: 503 });
    return NextResponse.json(parseCheckout(result.data), { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ message: "付款服務暫時無法使用，請稍後再試" }, { status: 503 }); }
}
