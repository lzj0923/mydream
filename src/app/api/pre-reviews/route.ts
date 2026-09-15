import { randomInt } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";
import { z } from "zod";
import { applicationDetailsSchema } from "@/lib/trademark-application";
import { allowedAttachmentCategories, isLinkedAttachment, legacyUploadCategories, validateUpload } from "@/lib/trademark-uploads";

export const runtime = "nodejs";

const usageValues = ["short-drama", "animation", "ai-kol", "entertainment-services", "social-content", "advertising-cooperation", "app-software", "digital-products", "apparel", "figurines-toys", "merchandise", "online-retail", "education-courses", "other"] as const;

const schema = z.object({
  applicationDetails: applicationDetailsSchema,
  ipName: z.string().trim().min(1).max(120),
  trademarkType: z.enum(["word", "logo", "combined"]),
  trademarkName: z.string().trim().min(1).max(160),
  trademarkColor: z.enum(["black-white", "color"]),
  foreignApplication: z.enum(["yes", "no"]),
  foreignApplicationCountries: z.string().trim().max(240).optional().default(""),
  foreignApplicationDate: z.string().trim().max(20).optional().default(""),
  foreignApplicationNumber: z.string().trim().max(120).optional().default(""),
  priorityClaim: z.enum(["yes", "no"]),
  usageScopes: z.array(z.enum(usageValues)).min(1),
  usageScopeOther: z.string().trim().max(200).optional().default(""),
  usageDescription: z.string().trim().max(300).optional().default(""),
  applicantType: z.enum(["individual", "company", "team"]),
  applicantChineseName: z.string().trim().min(1).max(160),
  applicantEnglishName: z.string().trim().max(160).optional().default(""),
  nationality: z.string().trim().min(1).max(80),
  contactName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(1).max(160),
  address: z.string().trim().min(1).max(300).optional().default(""),
  businessOrIdentityNumber: z.string().trim().min(1).max(120).optional().default(""),
  confirmationAccepted: z.literal("true"),
  preReviewAccepted: z.literal("true"),
}).superRefine((value, context) => {
  if (value.priorityClaim === "yes" && !(value.applicationDetails.priorities as unknown[]).length) context.addIssue({ code: "custom", path: ["applicationDetails"], message: "請填寫優先權聲明。" });
  if (value.priorityClaim === "no" && (value.applicationDetails.priorities as unknown[]).length) context.addIssue({ code: "custom", path: ["applicationDetails"], message: "優先權資料與選項不符。" });
  if (value.nationality === "other" && !value.applicationDetails.fields.nationalityOther) context.addIssue({ code: "custom", path: ["applicationDetails"], message: "請填寫國家名稱。" });
  if (value.applicantType !== "individual" && !value.applicationDetails.fields.representativeChinese) context.addIssue({ code: "custom", path: ["applicationDetails"], message: "請填寫代表人。" });
  if (value.foreignApplication === "yes" && (!value.foreignApplicationCountries || !value.foreignApplicationDate)) {
    context.addIssue({ code: "custom", path: ["foreignApplicationCountries"], message: "請填寫國外申請資料。" });
  }
  if (value.usageScopes.includes("other") && !value.usageScopeOther) {
    context.addIssue({ code: "custom", path: ["usageScopeOther"], message: "請填寫其他使用範圍。" });
  }
});

const values = (form: FormData, name: string) => form.getAll(name).map(String).filter(Boolean);
const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "資料格式不正確。" }, { status: 400 });

  let applicationDetails: unknown;
  try { applicationDetails = JSON.parse(String(form.get("applicationDetails") ?? "")); }
  catch { return NextResponse.json({ error: "申請明細格式不正確。" }, { status: 400 }); }
  const parsed = schema.safeParse({
    applicationDetails,
    ipName: String(form.get("ipName") ?? ""),
    trademarkType: String(form.get("trademarkType") ?? ""),
    trademarkName: String(form.get("trademarkName") ?? ""),
    trademarkColor: String(form.get("trademarkColor") ?? ""),
    foreignApplication: String(form.get("foreignApplication") ?? ""),
    foreignApplicationCountries: String(form.get("foreignApplicationCountries") ?? ""),
    foreignApplicationDate: String(form.get("foreignApplicationDate") ?? ""),
    foreignApplicationNumber: String(form.get("foreignApplicationNumber") ?? ""),
    priorityClaim: String(form.get("priorityClaim") ?? ""),
    usageScopes: values(form, "usageScopes"),
    usageScopeOther: String(form.get("usageScopeOther") ?? ""),
    usageDescription: String(form.get("usageDescription") ?? ""),
    applicantType: String(form.get("applicantType") ?? ""),
    applicantChineseName: String(form.get("applicantChineseName") ?? ""),
    applicantEnglishName: String(form.get("applicantEnglishName") ?? ""),
    nationality: String(form.get("nationality") ?? ""),
    contactName: String(form.get("contactName") ?? ""),
    email: String(form.get("email") ?? ""),
    phone: String(form.get("phone") ?? ""),
    address: String(form.get("address") ?? ""),
    businessOrIdentityNumber: String(form.get("businessOrIdentityNumber") ?? ""),
    confirmationAccepted: String(form.get("confirmationAccepted") ?? ""),
    preReviewAccepted: String(form.get("preReviewAccepted") ?? ""),
  });
  if (!parsed.success) return NextResponse.json({ error: "請完成所有必填欄位並檢查資料格式。" }, { status: 400 });

  const files = form.getAll("uploadedFiles").filter((value): value is File => value instanceof File && value.size > 0);
  const categories = values(form, "fileCategories");
  const linkedCategories = allowedAttachmentCategories(parsed.data.applicationDetails);
  const linked = categories.filter(isLinkedAttachment);
  const invalidFiles = files.length !== categories.length || files.length > 128 || files.reduce((sum, file) => sum + file.size, 0) > 100 * 1024 * 1024 || files.some((file, index) => !validateUpload(file, categories[index] ?? ""));
  const invalidCategories = new Set(linked).size !== linked.length || categories.some((category) => !legacyUploadCategories.includes(category) && !linkedCategories.has(category));
  if (invalidFiles || invalidCategories || !categories.includes("trademarkImage")) {
    return NextResponse.json({ error: "請檢查商標圖樣與附件：證明文件、委任書及中文譯本限 PDF／3MB；其他附件限 JPG、PNG、PDF／10MB，合計不超過 100MB。" }, { status: 400 });
  }

  const stamp = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replace(/-/g, "");
  const preReviewId = `PR-${stamp}-${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
  const storageRoot = path.join(process.cwd(), ".data", "pre-reviews", preReviewId);
  await mkdir(storageRoot, { recursive: true });

  const uploadedFiles: Array<{ category: string; originalName: string; storedName: string; size: number; type: string }> = [];
  for (const [index, file] of files.entries()) {
    const storedName = `${String(index + 1).padStart(2, "0")}-${safeName(file.name)}`;
    await writeFile(path.join(storageRoot, storedName), Buffer.from(await file.arrayBuffer()));
    uploadedFiles.push({ category: categories[index], originalName: file.name, storedName, size: file.size, type: file.type });
  }

  await writeFile(path.join(storageRoot, "submission.json"), JSON.stringify({
    preReviewId,
    status: "pending-review",
    submittedAt: new Date().toISOString(),
    ...parsed.data,
    confirmationAccepted: true,
    preReviewAccepted: true,
    uploadedFiles,
  }, null, 2));

  return NextResponse.json({ success: true, consultationId: preReviewId, status: "pending-review" }, { status: 201 });
}
