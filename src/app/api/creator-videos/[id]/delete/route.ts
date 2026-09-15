import { NextRequest, NextResponse } from "next/server";
import { isAllowedOrigin } from "@/lib/app-auth/request-security";
import { publicErrorMessage } from "@/lib/app-auth/response";
import { callAppApi } from "@/lib/app-auth/upstream";
import { appData, videoViewer, VideoApiError } from "@/lib/creator-video/server";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ message: "請求來源無效" }, { status: 403 });
  try {
    const { token } = await videoViewer();
    const { id } = await context.params;
    if (!/^[1-9]\d{0,14}$/.test(id)) throw new VideoApiError("視頻編號無效");
    // App delVideo binds the delete to the authenticated user_id.
    appData(await callAppApi("/api/video/delVideo", { token, body: { videoId: id } }));
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ message: publicErrorMessage(error, "刪除結果暫時無法確認，請先刷新作品列表") }, { status: error instanceof VideoApiError ? error.status : 502 });
  }
}
