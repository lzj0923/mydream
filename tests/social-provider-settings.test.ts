import assert from "node:assert/strict";
import test from "node:test";
import { socialProviderSettings } from "../src/lib/app-auth/provider-settings.ts";

const configured = {
  NEXT_PUBLIC_SITE_URL: "https://official.mydream.tw",
  APP_AUTH_GOOGLE_CLIENT_ID: "123-web.apps.googleusercontent.com",
  APP_AUTH_FACEBOOK_APP_ID: "123456789",
  APP_AUTH_FACEBOOK_APP_SECRET: "private-facebook-secret",
  APP_AUTH_APPLE_CLIENT_ID: "tw.mydream.web",
  APP_AUTH_APPLE_REDIRECT_URI: "https://official.mydream.tw/login",
};

test("unconfigured login providers stay disabled and explain missing environment keys", () => {
  const result = socialProviderSettings({});
  assert.deepEqual(result.providers, { google: null, facebook: null, apple: null });
  assert.deepEqual(result.diagnostics.facebook.missing, ["APP_AUTH_FACEBOOK_APP_ID", "APP_AUTH_FACEBOOK_APP_SECRET"]);
});

test("Facebook requires its server secret while independently configured Google stays enabled", () => {
  const result = socialProviderSettings({ ...configured, APP_AUTH_FACEBOOK_APP_SECRET: " " });
  assert.equal(result.providers.facebook, null);
  assert.ok(result.providers.google);
  assert.ok(result.providers.apple);
});

test("public provider configuration and diagnostics never expose server secrets", () => {
  const result = socialProviderSettings(configured);
  assert.ok(Object.values(result.diagnostics).every((item) => item.ready));
  assert.deepEqual(result.providers.facebook, { appId: "123456789" });
  assert.equal(JSON.stringify(result).includes(configured.APP_AUTH_FACEBOOK_APP_SECRET), false);
});

test("Apple rejects old domains, insecure returns, credentials and ambiguous return paths", () => {
  for (const address of [
    "https://funnytv.cn/pages/login/login", "http://official.mydream.tw/login",
    "https://official.mydream.tw.attacker.example/login", "https://name:secret@official.mydream.tw/login",
    "https://official.mydream.tw/login#token", "https://official.mydream.tw/login?next=/account",
    "https://official.mydream.tw/unknown", "not-a-url",
  ]) {
    const result = socialProviderSettings({ ...configured, APP_AUTH_APPLE_REDIRECT_URI: address });
    assert.equal(result.providers.apple, null, address);
    assert.deepEqual(result.diagnostics.apple.invalid, ["APP_AUTH_APPLE_REDIRECT_URI"]);
  }
});

test("custom HTTPS website uses its own login return and settings trim whitespace", () => {
  const result = socialProviderSettings({ ...configured, NEXT_PUBLIC_SITE_URL: "https://example.com/", APP_AUTH_APPLE_REDIRECT_URI: " https://example.com/login ", APP_AUTH_FACEBOOK_APP_ID: " 123456789 " });
  assert.equal(result.providers.apple?.redirectUri, "https://example.com/login");
  assert.equal(result.providers.facebook?.appId, "123456789");
});

test("malformed public identifiers disable only the affected provider", () => {
  const result = socialProviderSettings({ ...configured, APP_AUTH_GOOGLE_CLIENT_ID: "not-a-client-id", APP_AUTH_FACEBOOK_APP_ID: "not-an-app-id" });
  assert.equal(result.providers.google, null);
  assert.equal(result.providers.facebook, null);
  assert.ok(result.providers.apple);
});
