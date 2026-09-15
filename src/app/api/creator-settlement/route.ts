import {AppAccessError} from "@/lib/app-auth/access-error";
import { NextRequest, NextResponse } from "next/server";
import { callAppApi } from "@/lib/app-auth/upstream";
import { publicErrorMessage } from "@/lib/app-auth/response";
import { appData, VideoApiError, videoViewer } from "@/lib/creator-video/server";
import { record } from "@/lib/creator-video/domain";
import { decimalValue, settlementPage, type SettlementTab } from "@/lib/creator-settlement/domain";

export async function GET(request: NextRequest) {
  try {
    const { token, user } = await videoViewer();
    const profile = await callAppApi("/api/user/userInfo", { token, method: "GET" });
    appData(profile);
    const raw = record(profile.data), rawUser = record(raw.userinfo ?? raw);
    const tab: SettlementTab = request.nextUrl.searchParams.get("tab") === "withdrawals" ? "withdrawals" : "points";
    const page = Math.max(1, Math.min(10000, Math.floor(Number(request.nextUrl.searchParams.get("page")) || 1)));
    const query = new URLSearchParams({ page: String(page), limit: "10" });
    const endpoint = tab === "points" ? "getScoreConsumptionHistory" : "getUserWithdrawal";
    const result = await callAppApi(`/api/user/${endpoint}?${query}`, { token, method: "GET" });
    if (Number(result.code) === 401) throw new VideoApiError("App 登錄已失效，請重新登錄", 401);
    const data = settlementPage(appData(result), tab, user.id);
    return NextResponse.json({ userId: user.id, balance: decimalValue(rawUser.score), tab, page, ...data, hasMore: page * 10 < data.total }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ message: publicErrorMessage(error, "結算記錄暫時無法讀取"),code:error instanceof VideoApiError || error instanceof AppAccessError ? error.code : "APP_CONNECTION_UNAVAILABLE" }, { status: error instanceof VideoApiError || error instanceof AppAccessError ? error.status : 502, headers: { "Cache-Control": "no-store" } });
  }
}
