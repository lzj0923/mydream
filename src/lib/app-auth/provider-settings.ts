type Environment = Record<string, string | undefined>;

export function socialProviderSettings(env: Environment) {
  const value = (key: string) => env[key]?.trim() || "";
  const required = (keys: string[]) => keys.filter((key) => !value(key));
  const googleMissing = required(["APP_AUTH_GOOGLE_CLIENT_ID"]);
  const facebookMissing = required(["APP_AUTH_FACEBOOK_APP_ID", "APP_AUTH_FACEBOOK_APP_SECRET"]);
  const appleMissing = required(["APP_AUTH_APPLE_CLIENT_ID", "APP_AUTH_APPLE_REDIRECT_URI"]);
  const googleId = value("APP_AUTH_GOOGLE_CLIENT_ID");
  const facebookId = value("APP_AUTH_FACEBOOK_APP_ID");
  const appleId = value("APP_AUTH_APPLE_CLIENT_ID");
  const appleRedirect = value("APP_AUTH_APPLE_REDIRECT_URI");
  const googleInvalid = googleId && !/^[a-zA-Z0-9._-]+\.apps\.googleusercontent\.com$/.test(googleId) ? ["APP_AUTH_GOOGLE_CLIENT_ID"] : [];
  const facebookInvalid = facebookId && !/^\d+$/.test(facebookId) ? ["APP_AUTH_FACEBOOK_APP_ID"] : [];
  const appleInvalid: string[] = [];
  if (appleRedirect) {
    try {
      const site = new URL(value("NEXT_PUBLIC_SITE_URL") || "https://official.mydream.tw");
      const redirect = new URL(appleRedirect);
      if (redirect.protocol !== "https:" || redirect.origin !== site.origin || redirect.username || redirect.password || redirect.hash || redirect.search || redirect.pathname !== "/login") {
        appleInvalid.push("APP_AUTH_APPLE_REDIRECT_URI");
      }
    } catch { appleInvalid.push("APP_AUTH_APPLE_REDIRECT_URI"); }
  }
  const status = (missing: string[], invalid: string[]) => ({ ready: !missing.length && !invalid.length, missing, invalid });
  const diagnostics = {
    google: status(googleMissing, googleInvalid),
    facebook: status(facebookMissing, facebookInvalid),
    apple: status(appleMissing, appleInvalid),
  };
  return {
    diagnostics,
    // Only public SDK identifiers are sent to the login page. Never include secrets.
    providers: {
      google: diagnostics.google.ready ? { clientId: googleId } : null,
      facebook: diagnostics.facebook.ready ? { appId: facebookId } : null,
      apple: diagnostics.apple.ready ? { clientId: appleId, redirectUri: appleRedirect } : null,
    },
  };
}
