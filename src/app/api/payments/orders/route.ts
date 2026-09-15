import { NextResponse } from "next/server";
import { readAppToken } from "@/lib/app-auth/session";
import { callAppApi } from "@/lib/app-auth/upstream";

export async function GET() {
  const token = await readAppToken();
  if (!token) return NextResponse.json({ message: "請先登入" }, { status: 401 });
  try {
    const result = await callAppApi("/api/newebpay/orders", { token, method: "GET" });
    if (Number(result.code) !== 1) throw new Error("Unavailable");
    return NextResponse.json(result.data, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ message: "訂單暫時無法讀取，請稍後重新查詢" }, { status: 503 }); }
}
