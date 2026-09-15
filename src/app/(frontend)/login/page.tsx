import { getManagedPage } from "@/content/cms/java-cms-client";
import { managedBlock, managedBlockStyle } from "@/content/cms/managed-page-style";
import type { Metadata } from "next";

import { LoginClient } from "./login-client";
import { publicAuthProviders } from "@/lib/app-auth/config";
import { safeAccountNext } from "@/lib/app-auth/registration";

export const metadata: Metadata = { title: "登錄", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; registered?: string }> }) {
  const params = await searchParams;
  const page = await getManagedPage("/login", "zh-Hant");
  return <LoginClient backgroundStyle={managedBlockStyle(managedBlock(page, "page-background"))} providers={publicAuthProviders()} nextPath={safeAccountNext(params.next)} registered={params.registered === "1"} />;
}
