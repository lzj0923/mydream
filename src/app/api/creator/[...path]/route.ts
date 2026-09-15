import { isReviewRoute, isCreatorRoute } from "@/lib/creator-review-access";
import { NextRequest, NextResponse } from "next/server";
import { readCreatorToken } from "@/lib/creator-auth/server";
import { isAllowedOrigin } from "@/lib/app-auth/request-security";

import { state, authenticated, exclusive, upstream, persist, AdminError } from "@/lib/app-admin/server";
import { reviewToken } from "@/lib/app-admin/review-token";

export const dynamic = "force-dynamic";

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const route = path.join("/");
  if (!isCreatorRoute(route)) return NextResponse.json({ detail: "頁面不存在" }, { status: 404 });
  const query = route.endsWith("/publication-check") ? `?episodeNumber=${encodeURIComponent(request.nextUrl.searchParams.get("episodeNumber") || "")}` : "";
  const mutation = request.method !== "GET";
  if (mutation && (!request.headers.get("origin") || !isAllowedOrigin(request))) {
    return NextResponse.json({ detail: "請求來源無效，請刷新頁面後重試" }, { status: 403 });
  }
  const reviewRoute = isReviewRoute(route);
  const token = reviewRoute ? null : await readCreatorToken();
  if (!reviewRoute && !token) return NextResponse.json({ detail: "請先登錄創作者賬號" }, { status: 401 });
  const base = (process.env.CMS_API_URL?.trim() || "http://127.0.0.1:8080").replace(/\/$/, "");
  const headers = new Headers({ Accept: "application/json", "Content-Type": "application/json" });
  try {
    if (reviewRoute) {
      const session=await state(); authenticated(session);
      // Confirm the App session and drama-management permission with the owning backend.
      await exclusive(session,async()=>{try{await upstream(session,"short/drama/index?offset=0&limit=1");}finally{await persist(session);}});
      headers.set("Authorization", "Bearer "+reviewToken(session.actor!.id,request.method,`/creator-api/v1/${route}`,process.env.CMS_APP_REVIEW_KEY||""));
    } else headers.set("Authorization", `Bearer ${token}`);
    const body = mutation ? await request.text() : undefined;
    if (body && Buffer.byteLength(body, "utf8") > ((route === "verification" || /^projects\/[a-zA-Z0-9-]+\/materials$/.test(route)) ? 22 * 1024 * 1024 : 900_000)) return NextResponse.json({ detail: "提交內容過大，請縮小文件或精簡內容" }, { status: 413 });
    const response = await fetch(`${base}/creator-api/v1/${route}${query}`, {
      method: request.method, headers, body, cache: "no-store", signal: AbortSignal.timeout(45_000), redirect: "error",
    });
    if (!response.headers.get("content-type")?.includes("json")) throw new Error("Invalid upstream response");
    return NextResponse.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if(error instanceof AdminError) return NextResponse.json({detail:error.message},{status:error.status,headers:{"Cache-Control":"no-store"}});
    return NextResponse.json({ detail: "創作服務暫時無法連接，請稍後重試。未保存的內容仍保留在編輯器中。" }, { status: 503 });
  }
}

export { proxy as GET, proxy as POST, proxy as PUT };


