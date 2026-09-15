import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { CreatorAuthError, creatorAuthRequest, creatorVerification, readCreatorToken } from "@/lib/creator-auth/server";

export const dynamic = "force-dynamic";

export default async function WorkspaceAccess({ children }: { children: ReactNode }) {
  const token = await readCreatorToken();
  if (!token) redirect("/creator/login");
  try {
    await creatorAuthRequest("me", token);
  } catch (error) {
    if (error instanceof CreatorAuthError && error.status === 401) redirect("/creator/login");
    throw error;
  }
  if ((await creatorVerification(token)).state === "NONE") redirect("/creator/verification");
  return children;
}
