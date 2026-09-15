export type CreatorAccount = {
  id: string;
  username: string;
  displayName: string;
  appUserId: number | null;
  appUsername: string | null;
  appExpiresAt: string | null;
};

export function safeCreatorReturn(value: string | null): string {
  return value && /^\/creator\/workspace(?:[?#].*)?$/.test(value) && !/[\r\n\\]/.test(value)
    ? value : "/creator/workspace";
}
