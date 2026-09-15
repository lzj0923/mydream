import { NextResponse } from "next/server";

// Cross-site POST can omit SameSite=Lax cookies. A 303 returns to a first-party GET.
// The browser return is never trusted to grant coins or mark an order as paid.
export async function POST(request: Request) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  return NextResponse.redirect(new URL("/tasks/payment", origin), 303);
}
