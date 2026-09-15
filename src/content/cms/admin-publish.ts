export type CmsAdminRequest = <T>(path: string, options?: RequestInit, csrf?: boolean) => Promise<T>;

type PublicShell = {
  config?: {
    footer?: {
      copyright?: unknown;
    };
  };
};

export async function publishLatestDraft(
  request: CmsAdminRequest,
  siteId: string,
  changeNote: string,
) {
  return request(`/admin-api/v1/sites/${siteId}/releases`, {
    method: "POST",
    body: JSON.stringify({ changeNote }),
  }, true);
}

export async function verifyPublishedFooterCopyright(
  request: CmsAdminRequest,
  siteKey: string,
  expectedCopyright: string,
) {
  const shell = await request<PublicShell>(
    `/public-api/v1/sites/${encodeURIComponent(siteKey)}/shell?refresh=${Date.now()}`,
    { cache: "no-store", headers: { "Cache-Control": "no-cache" } },
  );
  const publishedCopyright = shell.config?.footer?.copyright;
  if (publishedCopyright !== expectedCopyright) {
    throw new Error("底部欄已保存，但公開版本仍是舊內容；請不要關閉頁面並重試發佈。");
  }
}
