import { NextResponse } from "next/server";

// Retired: no endpoint may require both CMS and App administrator sessions.
export async function POST() {
  return NextResponse.json({ message: "App 草稿及上架請在獨立的 App 管理後台處理；官網僅負責交付審核與資料匯出", code: "ADMIN_SYSTEMS_SEPARATED" }, { status: 410, headers: { "Cache-Control": "no-store" } });
}
