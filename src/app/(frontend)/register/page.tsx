import { getManagedPage } from "@/content/cms/java-cms-client";
import { managedBlock, managedBlockStyle } from "@/content/cms/managed-page-style";
import type { Metadata } from "next";
import { safeAccountNext } from "@/lib/app-auth/registration";
import { RegisterClient } from "./register-client";

export const metadata: Metadata = { title: "註冊", robots: { index: false, follow: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const page = await getManagedPage("/register", "zh-Hant");
  return <RegisterClient backgroundStyle={managedBlockStyle(managedBlock(page, "page-background"))} nextPath={safeAccountNext((await searchParams).next)} />;
}
