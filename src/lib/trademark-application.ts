import { z } from "zod";
import countries from "../data/tipo-countries.json" with { type: "json" };
import { findClass, classItems, makeGoodsSelection, type GoodsSelection } from "./trademark-catalog";

// Ordinary trademark application: TIPO T0101 and S040/help/11d.html.
export type ApplicationField = { key: string; label: string; type?: "date" | "email" | "textarea"; required?: boolean; options?: string[] };
export const detailFields: Record<string, ApplicationField[]> = {
  trademark: [
    { key: "caseReference", label: "事務所／申請人案件編號" },
    { key: "chineseText", label: "圖樣分析：中文" }, { key: "foreignText", label: "圖樣分析：外文" },
    { key: "language", label: "語文別" }, { key: "translation", label: "外文的中文字義" },
    { key: "graphicDescription", label: "圖形說明", type: "textarea" }, { key: "symbols", label: "記號" },
    { key: "disclaimer", label: "聲明不專用的文字／圖形部分", type: "textarea" },
    { key: "distinctiveness", label: "是否主張經使用取得識別性", options: ["否", "是"] },
  ],
  applicant: [
    { key: "nationalityOther", label: "其他國籍：國家名稱（選其他時填寫）" },
    { key: "representativeChinese", label: "法人／商號代表人中文姓名" }, { key: "representativeEnglish", label: "代表人英文姓名" },
    { key: "englishAddress", label: "英文地址" }, { key: "postalCode", label: "郵遞區號" },
    { key: "extension", label: "電話分機" }, { key: "fax", label: "傳真" },
    { key: "deliveryName", label: "送達收件人" }, { key: "deliveryAddress", label: "送達地址（與申請人地址不同時填寫）" },
    { key: "selectedRepresentative", label: "共有申請的選定代表人姓名／名稱" },
  ],
  documents: [
    { key: "declaration", label: "具結方式", options: ["申請人確認資料真實", "代理人依申請人提供資料具結"] },
    { key: "pendingDispute", label: "需等待確定的商標爭議案註冊號" },
    { key: "notes", label: "其他備註／關聯案件", type: "textarea" },
    { key: "originalPowerCase", label: "委任書正本已附案件案號（使用影本時填寫）" },
    { key: "attachmentNotes", label: "附件名稱、份數與待補文件說明", type: "textarea" },
  ],
};
export const repeatFields: Record<string, ApplicationField[]> = {
  priorities: [ { key: "date", label: "優先權日", type: "date", required: true }, { key: "country", label: "第一次申請國家或地區", required: true, options: countries.payload.map((country) => country.countryCode + country.countryName) }, { key: "number", label: "案號", required: true }, { key: "goods", label: "適用商品／服務（部分優先權時填寫）", type: "textarea" } ],
  exhibitions: [ { key: "name", label: "展覽會名稱", required: true }, { key: "date", label: "展覽會優先權日", type: "date", required: true }, { key: "goods", label: "展出商品／服務", type: "textarea" } ],
  goods: [ { key: "class", label: "商品／服務類別", required: true, options: Array.from({ length: 45 }, (_, i) => String(i + 1).padStart(2, "0")) }, { key: "names", label: "指定商品／服務名稱（每行一項）", type: "textarea", required: true }, { key: "codes", label: "商品／服務代碼（如已知）" } ],
  coApplicants: [ { key: "type", label: "身分種類", required: true, options: ["自然人", "法人、公司、機關、學校", "商號、行號、工廠"] }, { key: "nationality", label: "國籍／地區", required: true }, { key: "id", label: "身分證字號／統一編號／識別代碼", required: true }, { key: "name", label: "中文姓名／名稱", required: true }, { key: "englishName", label: "英文姓名／名稱" }, { key: "representative", label: "代表人中文姓名" }, { key: "representativeEnglish", label: "代表人英文姓名" }, { key: "address", label: "中文地址", required: true }, { key: "englishAddress", label: "英文地址" }, { key: "contact", label: "聯絡人" }, { key: "phone", label: "聯絡電話及分機", required: true }, { key: "fax", label: "傳真" }, { key: "email", label: "Email", type: "email" } ],
  agents: [ { key: "name", label: "代理人姓名", required: true }, { key: "id", label: "身分證字號／識別代碼", required: true }, { key: "registration", label: "代理人登錄字號" }, { key: "office", label: "事務所名稱" }, { key: "address", label: "地址", required: true }, { key: "contact", label: "聯絡人" }, { key: "phone", label: "聯絡電話及分機", required: true }, { key: "fax", label: "傳真" }, { key: "email", label: "Email", type: "email" } ],
};

function fieldsSchema(fields: ApplicationField[]) {
  return z.object(Object.fromEntries(fields.map((field) => {
    let value = z.string().trim().max(field.type === "textarea" ? 5000 : 300);
    if (field.required) value = value.min(1, `請填寫${field.label}`);
    return [field.key, value.refine((text) => !text || !field.options || field.options.includes(text), "請選擇有效選項")
      .refine((text) => !text || field.type !== "date" || (/^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(text)) && new Date(text).toISOString().slice(0, 10) === text), "日期格式不正確")
      .refine((text) => !text || field.type !== "email" || z.email().safeParse(text).success, "Email 格式不正確")];
  })));
}
const withAttachmentId = (group: string) => fieldsSchema(repeatFields[group]).extend({ attachmentId: z.uuid().optional() });
const goodsSchema = z.object({
  class: z.string().refine((code) => /^\d{2,3}$/.test(code) && !!findClass(code), "商品類別不存在"),
  names: z.string().trim().min(1).max(200000), codes: z.string().max(200000),
  selectedCodes: z.array(z.string().max(40)).max(5000).optional(),
  customNames: z.array(z.string().trim().min(1).max(300)).max(500).optional(),
}).superRefine((row, ctx) => {
  const category = findClass(row.class);
  if (!category || !row.selectedCodes) return;
  const allowed = new Set(classItems(category).map((item) => item.code));
  if (row.selectedCodes.some((code) => !allowed.has(code)) || new Set(row.selectedCodes).size !== row.selectedCodes.length) ctx.addIssue({ code: "custom", message: "商品代碼不屬於指定類別或重複。" });
  const expected = makeGoodsSelection(row.class, row.selectedCodes, row.customNames ?? []);
  if (row.names !== expected.names || row.codes !== expected.codes) ctx.addIssue({ code: "custom", message: "所選商品名稱與官方代碼不符。" });
});
export const applicationDetailsSchema = z.object({
  fields: fieldsSchema(Object.values(detailFields).flat()),
  priorities: z.array(withAttachmentId("priorities")).max(5),
  exhibitions: z.array(withAttachmentId("exhibitions")).max(5),
  goods: z.array(goodsSchema).min(1).max(45),
  coApplicants: z.array(fieldsSchema(repeatFields.coApplicants)).max(45),
  agents: z.array(withAttachmentId("agents")).max(45),
}).superRefine((value, ctx) => {
  const goods = value.goods;
  if (!goods.length) ctx.addIssue({ code: "custom", message: "請填寫至少一類指定商品／服務。", path: ["goods"] });
  if (new Set(goods.map((row) => row.class.padStart(3, "0"))).size !== goods.length) ctx.addIssue({ code: "custom", message: "同一類商品請合併填寫。", path: ["goods"] });
  for (const group of [value.priorities, value.exhibitions, value.agents]) {
    const ids = group.map((row) => row.attachmentId).filter(Boolean);
    if (ids.length !== new Set(ids).size) ctx.addIssue({ code: "custom", message: "附件關聯識別碼重複。" });
  }
});
export type ApplicationDetails = { fields: Record<string, string>; priorities: Record<string, string>[]; exhibitions: Record<string, string>[]; goods: GoodsSelection[]; coApplicants: Record<string, string>[]; agents: Record<string, string>[] };
export function emptyApplicationDetails(): ApplicationDetails {
  return { fields: Object.fromEntries(Object.values(detailFields).flat().map(({ key }) => [key, ""])), priorities: [], exhibitions: [], goods: [], coApplicants: [], agents: [] };
}
export function emptyRow(group: string): Record<string, string> { return { ...Object.fromEntries(repeatFields[group].map(({ key }) => [key, ""])), ...(["priorities", "exhibitions", "agents"].includes(group) ? { attachmentId: crypto.randomUUID() } : {}) }; }
