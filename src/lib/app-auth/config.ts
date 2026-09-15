import "server-only";
import { socialProviderSettings } from "./provider-settings";

function clean(value: string | undefined): string | undefined {
  const result = value?.trim();
  return result || undefined;
}

export function appAuthConfig() {
  const baseUrl = clean(process.env.APP_AUTH_API_URL) ?? "https://share.the-drama-has-a-plot.com";
  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    googleClientId: clean(process.env.APP_AUTH_GOOGLE_CLIENT_ID),
    facebookAppId: clean(process.env.APP_AUTH_FACEBOOK_APP_ID),
    facebookAppSecret: clean(process.env.APP_AUTH_FACEBOOK_APP_SECRET),
    appleClientId: clean(process.env.APP_AUTH_APPLE_CLIENT_ID),
    appleRedirectUri: clean(process.env.APP_AUTH_APPLE_REDIRECT_URI),
  };
}

export function publicAuthProviders() {
  return socialProviderSettings(process.env).providers;
}
