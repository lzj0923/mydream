import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { applicationDetailsSchema, emptyApplicationDetails, emptyRow } from "../src/lib/trademark-application.ts";
import { classItems, filterCatalog, makeGoodsSelection, trademarkCatalog } from "../src/lib/trademark-catalog.ts";
import { allowedAttachmentCategories, attachmentCategory, attachmentLabel, validateUpload } from "../src/lib/trademark-uploads.ts";

function validDetails() {
  const details = emptyApplicationDetails();
  details.goods = [makeGoodsSelection("041", [classItems(trademarkCatalog[40])[0].code], ["測試自訂服務"]), makeGoodsSelection("009", [classItems(trademarkCatalog[8])[0].code], [])];
  details.fields.disclaimer = "文字部分";
  details.priorities = [{ ...emptyRow("priorities"), country: "JP日本", date: "2026-08-01", number: "TEST-001" }];
  details.exhibitions = [{ ...emptyRow("exhibitions"), name: "測試展覽", date: "2026-08-02" }];
  details.agents = [{ ...emptyRow("agents"), name: "測試代理人", id: "TEST-ID", address: "測試地址", phone: "0000000000", email: "agent@example.test" }];
  details.coApplicants = [{ ...emptyRow("coApplicants"), type: "自然人", nationality: "日本", id: "TEST-CO", name: "共同測試人", address: "測試地址", phone: "0000000000" }];
  return details;
}

test("multiple classes, priority, exhibition and parties survive serialization and validation", () => {
  const details = validDetails();
  assert.deepEqual(applicationDetailsSchema.parse(JSON.parse(JSON.stringify(details))), details);
});
test("reject missing goods, out-of-range classes and duplicate classes", () => {
  for (const goods of [[], [{ class: "46", names: "test", codes: "" }], [{ class: "41", names: "", codes: "" }], [validDetails().goods[0], validDetails().goods[0]]]) {
    assert.equal(applicationDetailsSchema.safeParse({ ...validDetails(), goods }).success, false);
  }
});
test("reject incomplete parties, impossible dates and invalid email", () => {
  const missing = validDetails(); missing.agents[0].name = " ";
  const date = validDetails(); date.priorities[0].date = "2026-02-30";
  const email = validDetails(); email.agents[0].email = "invalid";
  for (const value of [missing, date, email]) assert.equal(applicationDetailsSchema.safeParse(value).success, false);
});

test("official catalog preserves all 45 classes, groups, subgroups and 20623 names/codes", () => {
  assert.deepEqual(trademarkCatalog.map((category) => category.code), Array.from({ length: 45 }, (_, i) => String(i + 1).padStart(3, "0")));
  assert.equal(trademarkCatalog.reduce((sum, category) => sum + category.topItems.length, 0), 638);
  assert.equal(trademarkCatalog.flatMap((category) => category.topItems).reduce((sum, group) => sum + group.middleItems.length, 0), 897);
  assert.equal(trademarkCatalog.flatMap(classItems).length, 20623);
  for (const category of trademarkCatalog) {
    const items = classItems(category);
    const selection = makeGoodsSelection(category.code, items.map((item) => item.code), []);
    assert.deepEqual(selection.selectedCodes, items.map((item) => item.code));
    assert.equal(selection.names, [...new Set(items.map((item) => item.name))].join("\n"));
    assert.ok(category.topItems.every((group) => group.name && group.middleItems.every((middle) => middle.lowItems.length)));
  }
});
test("catalog search retains group ancestry and exact item codes", () => {
  for (const category of trademarkCatalog) {
    const item = classItems(category).at(-1)!;
    const result = filterCatalog(item.code);
    assert.ok(result.some((entry) => entry.code === category.code && classItems(entry).some((found) => found.code === item.code && found.name === item.name)));
  }
  assert.equal(filterCatalog("NO_SUCH_TIPO_PRODUCT").length, 0);
});
test("reject forged item name/code combinations and classes mixed across selections", () => {
  const forged = validDetails(); forged.goods[0].names = "不相符名稱";
  assert.equal(applicationDetailsSchema.safeParse(forged).success, false);
  const foreign = validDetails(); foreign.goods[0].selectedCodes = [classItems(trademarkCatalog[0])[0].code];
  assert.equal(applicationDetailsSchema.safeParse(foreign).success, false);
});
test("each claim and agent has its own PDF-only proof/translation with exact 3MB boundary", () => {
  const details = validDetails();
  const allowed = allowedAttachmentCategories(details);
  assert.equal(allowed.size, 6);
  for (const category of allowed) {
    assert.equal(validateUpload({ name: "proof.pdf", type: "application/pdf", size: 3 * 1024 * 1024 }, category), true);
    assert.equal(validateUpload({ name: "proof.pdf", type: "application/pdf", size: 3 * 1024 * 1024 + 1 }, category), false);
    assert.equal(validateUpload({ name: "proof.png", type: "image/png", size: 100 }, category), false);
    assert.equal(validateUpload({ name: "proof.png", type: "application/pdf", size: 100 }, category), false);
  }
  const removed = { ...details, priorities: [] };
  assert.equal(allowedAttachmentCategories(removed).has(attachmentCategory("priorities", details.priorities[0].attachmentId, true)), false);
  assert.match(attachmentLabel(attachmentCategory("priorities", details.priorities[0].attachmentId, true), details), /優先權 1.*中文譯本/);
});

test("local API stores complete details and attachments; rejects malformed submissions", { skip: !process.env.PRE_REVIEW_TEST_URL }, async () => {
  const url = new URL(process.env.PRE_REVIEW_TEST_URL!);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  const form = new FormData();
  const details = validDetails();
  const fields = { ipName: "AUTOMATED TEST", trademarkType: "word", trademarkName: "TEST", trademarkColor: "black-white", foreignApplication: "no", priorityClaim: "yes", usageScopes: "entertainment-services", applicantType: "individual", applicantChineseName: "測試申請人", nationality: "TW", contactName: "測試", email: "test@example.test", phone: "0000000000", address: "測試地址", businessOrIdentityNumber: "TEST-ONLY", confirmationAccepted: "true", preReviewAccepted: "true", applicationDetails: JSON.stringify(details) };
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  form.append("uploadedFiles", new File([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZQAAAABJRU5ErkJggg==", "base64")], "test.png", { type: "image/png" }));
  form.append("fileCategories", "trademarkImage");
  const linked = [...allowedAttachmentCategories(details)];
  for (const category of linked) {
    form.append("uploadedFiles", new File(["%PDF-1.4\n% Test attachment"], `${category.split(":")[0]}.pdf`, { type: "application/pdf" }));
    form.append("fileCategories", category);
  }
  form.set("applicationDetails", "{}");
  assert.equal((await fetch(url, { method: "POST", body: form })).status, 400);
  form.set("applicationDetails", JSON.stringify(details));
  const invalidFiles = new FormData();
  for (const [key, value] of form.entries()) invalidFiles.append(key, value);
  invalidFiles.append("uploadedFiles", new File(["png"], "bad.png", { type: "image/png" }));
  invalidFiles.append("fileCategories", attachmentCategory("priorities", crypto.randomUUID(), true));
  assert.equal((await fetch(url, { method: "POST", body: invalidFiles })).status, 400);
  const response = await fetch(url, { method: "POST", body: form });
  assert.equal(response.status, 201, await response.clone().text());
  const result = await response.json();
  assert.match(result.consultationId, /^PR-\d{8}-\d{6}$/);
  const root = path.resolve(".data/pre-reviews");
  const directory = path.resolve(root, result.consultationId);
  assert.equal(path.dirname(directory), root);
  try {
    const stored = JSON.parse(await readFile(path.join(directory, "submission.json"), "utf8"));
    assert.equal(stored.ipName, "AUTOMATED TEST");
    assert.deepEqual(stored.applicationDetails, details);
    assert.deepEqual(stored.uploadedFiles.map((file: { category: string }) => file.category), ["trademarkImage", ...linked]);
    assert.ok((await readFile(path.join(directory, stored.uploadedFiles[0].storedName))).length > 0);
  } finally { await rm(directory, { recursive: true }); }
});
