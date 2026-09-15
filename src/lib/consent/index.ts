export const consentStorageKey = "mydream-consent";

export type ConsentLoadState = "loading" | "unset" | "accepted" | "rejected";

export function parseStoredConsent(value: string | null): Exclude<ConsentLoadState, "loading"> {
  if (value === "analytics") return "accepted";
  if (value === "necessary") return "rejected";
  return "unset";
}

export function shouldLoadAnalytics(input: {
  hydrated: boolean;
  consent: ConsentLoadState;
  enabled: boolean;
  providerId?: string;
}): boolean {
  return input.hydrated && input.consent === "accepted" && input.enabled && Boolean(input.providerId);
}
