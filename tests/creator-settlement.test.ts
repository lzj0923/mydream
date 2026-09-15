import assert from "node:assert/strict";
import test from "node:test";
import { decimalValue, settlementPage } from "@/lib/creator-settlement/domain";
import { creatorContracts } from "@/content/creator-contracts";

test("settlement keeps exact decimal strings and missing balances remain unknown", () => {
  assert.equal(decimalValue("123456789012345678.90"), "123456789012345678.90");
  assert.equal(decimalValue("0.00"), "0.00");
  for (const value of [null, undefined, "", NaN, Infinity, {}, "not available"]) assert.equal(decimalValue(value), null);
});
test("withdrawal records separate points from cash and omit private account fields", () => {
  const page = settlementPage({ total: 1, data: [{ id: 8, user_id: 12, amount: "100", actual_amount: "10.00", status: 1, withdrawal_type: 1, withdrawal_method: 2, bank_data: "private-account", token: "secret" }] }, "withdrawals", 12);
  assert.equal(page.items[0].amount, "100"); assert.equal(page.items[0].actualAmount, "10.00");
  assert.equal(page.items[0].status, "已打款"); assert.equal(page.items[0].method, "銀行卡");
  assert.ok(!JSON.stringify(page).includes("private-account")); assert.ok(!JSON.stringify(page).includes("secret"));
});
test("settlement rejects other owners and malformed results instead of displaying empty finances", () => {
  for (const value of [null, {}, { total: null, data: [] }, { total: 1, data: [{ user_id: 13 }] }, { total: 1, data: [{}] }]) assert.throws(() => settlementPage(value, "points", 12));
  assert.deepEqual(settlementPage({ total: 0, data: [] }, "points", 12), { total: 0, items: [] });
});
test("points show their actual direction and contracts remain empty", () => {
  const page = settlementPage({ total: 1, data: [{ id: 9, user_id: 12, score: "20", type: 2, description: "积分兑换" }] }, "points", 12);
  assert.equal(page.items[0].status, "支出"); assert.equal(page.items[0].actualAmount, null);
  assert.deepEqual(creatorContracts.documents, []);
});
