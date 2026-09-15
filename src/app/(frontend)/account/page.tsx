import type { Metadata } from "next";

import { AccountClient } from "./account-client";

export const metadata: Metadata = { title: "我的賬號", robots: { index: false, follow: false } };

export default function AccountPage() {
  return <AccountClient />;
}

