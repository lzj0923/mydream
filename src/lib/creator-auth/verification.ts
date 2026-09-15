export type Verification = { id?: string; state: "NONE" | "PENDING" | "APPROVED" | "REJECTED"; creatorType?: "COMIC" | "SHORT_DRAMA"; entityType?: "PERSONAL" | "BUSINESS"; reviewNote?: string; version: number };
export const verificationLabels = { NONE: "尚未提交認證", PENDING: "身份認證審核中", APPROVED: "身份認證已通過", REJECTED: "身份認證需補充資料" };
export const creatorTypes = { COMIC: "漫劇創作者", SHORT_DRAMA: "短劇創作者" };
export const entityTypes = { PERSONAL: "個人", BUSINESS: "企業" };
