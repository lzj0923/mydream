import { notFound } from "next/navigation";

import { ManagedPage } from "@/components/cms/managed-page";
import { getManagedPage, isJavaCmsEnabled } from "@/content/cms/java-cms-client";

export default async function JavaManagedPage({ params }: { params: Promise<{ managed: string[] }> }) {
  if (!isJavaCmsEnabled()) notFound();
  const { managed } = await params;
  const page = await getManagedPage(`/${managed.join("/")}`);
  if (!page) notFound();
  return <ManagedPage page={page} />;
}
