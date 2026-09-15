import assert from "node:assert/strict";
import test from "node:test";
import { parseCheckout } from "@/lib/payments/checkout";
import { buildContentSecurityPolicy } from "@/lib/security/csp";

const checkout = { orderNo: `MD${"a".repeat(28)}`, environment: "test", gateway: "https://ccore.newebpay.com/MPG/mpg_gateway", fields: {
  MerchantID: "MS12345678", TradeInfo: "ab".repeat(32), TradeSha: "A".repeat(64), Version: "2.3",
} };

test("checkout rejects substituted gateway, environment and malformed signed fields", () => {
  assert.equal(parseCheckout(checkout).gateway, checkout.gateway);
  for (const value of [null, {}, { ...checkout, gateway: "https://attacker.example" },
    { ...checkout, environment: "production" }, { ...checkout, orderNo: "invalid" },
    { ...checkout, fields: { ...checkout.fields, TradeInfo: "abc" } },
    { ...checkout, fields: { ...checkout.fields, TradeSha: "fake" } }]) assert.throws(() => parseCheckout(value));
});

test("only protocol fields reach the HTML form", () => {
  const parsed = parseCheckout({ ...checkout, fields: { ...checkout.fields, HashKey: "should-never-reach-browser", userId: "123" } });
  assert.deepEqual(Object.keys(parsed.fields), ["MerchantID", "TradeInfo", "TradeSha", "Version"]);
});

test("CSP permits browser payment form on exact payment hosts", () => {
  const policy = buildContentSecurityPolicy("production");
  assert.match(policy, /form-action 'self' https:\/\/core\.newebpay\.com https:\/\/ccore\.newebpay\.com(?:;|$)/);
  assert.doesNotMatch(policy, /form-action[^;]*\*/);
});
