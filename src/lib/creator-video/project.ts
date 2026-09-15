import { record } from "./domain";

export type ProjectUpload = { projectId: string; episodeNumber: number };
export function projectUpload(input: unknown): ProjectUpload | undefined {
  const data = record(input);
  if (data.projectId === undefined || data.projectId === "") {
    if (data.episodeNumber !== undefined) throw new Error("請先選擇所屬項目");
    return undefined;
  }
  if (typeof data.projectId !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(data.projectId)) throw new Error("項目編號無效");
  const episodeNumber = Number(data.episodeNumber);
  if (!Number.isInteger(episodeNumber) || episodeNumber < 1 || episodeNumber > 500) throw new Error("請填寫 1 至 500 的集數");
  return { projectId: data.projectId, episodeNumber };
}

/** One edit policy for project entry points and upload controls. Unknown states fail closed. */
export function episodeEditReason(stage:string,states:string[],published=false):string {
  if(published||states.includes("PUBLISHED"))return "已上架";
  if(states.includes("APPROVED"))return "已驗收通過";
  if(states.includes("SUBMITTED"))return "正在審核";
  if(stage!=="PRODUCING")return "目前不可編輯";
  if(states.some(state=>!["DRAFT","CHANGES_REQUESTED","ARCHIVED"].includes(state)))return "狀態待確認";
  return "";
}
