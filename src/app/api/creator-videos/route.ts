import { NextRequest, NextResponse } from "next/server";
import { appAuthConfig } from "@/lib/app-auth/config";
import { callAppApi } from "@/lib/app-auth/upstream";
import { publicErrorMessage } from "@/lib/app-auth/response";
import { videoList } from "@/lib/creator-video/domain";
import { appData, videoViewer, VideoApiError } from "@/lib/creator-video/server";

export async function GET(request: NextRequest) {
  try {
    const { token, user } = await videoViewer();
    const page = Math.max(1, Math.min(1000, Number(request.nextUrl.searchParams.get("page")) || 1));
    const query = new URLSearchParams({ userId: String(user.id), pageNo: String(Math.floor(page)), pageSize: "12" });
    const result = appData(await callAppApi(`/api/video/myVideo?${query}`, { token, method: "GET" }));
    const assetBase = process.env.CMS_APP_PUBLIC_BASE_URL || "https://new-mydream.oss-cn-hongkong.aliyuncs.com";
    const items = videoList(result, assetBase || appAuthConfig().baseUrl);
    return NextResponse.json({ items, page, hasMore: items.length === 12, userId: user.id }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ message: publicErrorMessage(error, "視頻列表暫時無法讀取"),code:error instanceof VideoApiError?error.code:"VIDEO_UNAVAILABLE" }, { status: error instanceof VideoApiError ? error.status : 502 });
  }
}
