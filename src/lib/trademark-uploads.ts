import type { ApplicationDetails } from "./trademark-application";

export const legacyUploadCategories = ["trademarkImage", "foreignApplicationFile", "document-trademark", "document-character", "document-brand-use", "document-foreign", "document-other", "document-priority", "document-exhibition", "document-power", "document-translation", "document-identity", "document-evidence", "document-signature"];
export const attachmentGroups = { priorities: "priority", exhibitions: "exhibition", agents: "agent" } as const;
export type AttachmentGroup = keyof typeof attachmentGroups;
export const attachmentTitles = { priorities: ["證明文件", "證明文件中文譯本"], exhibitions: ["展覽會證明文件", "展覽會證明文件中文譯本"], agents: ["代理人委任書", "代理人委任書中文譯本"] } as const;
export const attachmentCategory = (group: AttachmentGroup, id: string, translation = false) => `${attachmentGroups[group]}-${translation ? "translation" : "proof"}:${id}`;
export const isLinkedAttachment = (category: string) => /^(priority|exhibition|agent)-(proof|translation):/.test(category);
export function allowedAttachmentCategories(details: Record<AttachmentGroup, { attachmentId?: string }[]>) {
  return new Set(Object.keys(attachmentGroups).flatMap((group) => details[group as AttachmentGroup].flatMap((row) => row.attachmentId ? [attachmentCategory(group as AttachmentGroup, row.attachmentId), attachmentCategory(group as AttachmentGroup, row.attachmentId, true)] : [])));
}
export function uploadRule(category: string) {
  const pdfOnly = isLinkedAttachment(category) || ["document-priority", "document-exhibition", "document-power", "document-translation"].includes(category);
  return { pdfOnly, maxBytes: (pdfOnly ? 3 : 10) * 1024 * 1024, accept: pdfOnly ? ".pdf,application/pdf" : ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf",
    hint: pdfOnly ? "僅能上傳PDF檔，檔案大小不超過3MB。" : "支援 JPG、PNG、PDF，單檔上限 10MB。" };
}
export function validateUpload(file: { type: string; name: string; size: number }, category: string) {
  const rule = uploadRule(category);
  return file.size > 0 && file.size <= rule.maxBytes && (rule.pdfOnly ? file.type === "application/pdf" && /\.pdf$/i.test(file.name) : ["image/jpeg", "image/png", "application/pdf"].includes(file.type));
}
export function attachmentLabel(category: string, details: Pick<ApplicationDetails, AttachmentGroup>) {
  for (const key of Object.keys(attachmentGroups) as AttachmentGroup[]) {
    for (const [index, row] of details[key].entries()) {
      for (const translation of [false, true]) if (category === attachmentCategory(key, row.attachmentId, translation)) return `${({ priorities: "優先權", exhibitions: "展覽會優先權", agents: "代理人" })[key]} ${index + 1} · ${attachmentTitles[key][translation ? 1 : 0]}`;
    }
  }
  return category;
}
