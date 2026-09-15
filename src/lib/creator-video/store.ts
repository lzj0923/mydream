import { randomUUID } from "node:crypto";
import { mkdir, open, opendir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { VideoMetadata } from "./domain";

export type UploadRecord = VideoMetadata & {
  id: string; ownerId: number; videoId: string; attachmentId: string; coverUrl: string;
  projectId?: string; episodeNumber?: number; submissionId?: string;
  createdAt: number; state: "draft" | "publishing" | "published" | "unknown" | "delivered";
};
export function uploadDirectory() { return process.env.CREATOR_VIDEO_STATE_DIR || path.join(process.cwd(), ".data", "creator-videos"); }
function location(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("上傳記錄不存在");
  return path.join(uploadDirectory(), `${id}.json`);
}
export async function createUploadRecord(record: Omit<UploadRecord, "id" | "createdAt" | "state" | "coverUrl">) {
  const entry: UploadRecord = { ...record, id: randomUUID(), createdAt: Date.now(), state: "draft", coverUrl: "" };
  await mkdir(uploadDirectory(), { recursive: true, mode: 0o700 });
  await writeFile(location(entry.id), JSON.stringify(entry), { flag: "wx", mode: 0o600 });
  return entry;
}
export async function ownedUpload(id: string, ownerId: number): Promise<UploadRecord> {
  const entry = JSON.parse(await readFile(location(id), "utf8")) as UploadRecord;
  if (entry.ownerId !== ownerId) throw new Error("無權操作此上傳記錄");
  if (Date.now() - entry.createdAt > 7 * 86400000) throw new Error("上傳記錄已過期，請重新上傳");
  return entry;
}
export async function saveUpload(entry: UploadRecord) {
  const target = location(entry.id), temp = `${target}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(entry), { mode: 0o600 });
  await rename(temp, target);
}
/** Read only: CMS ownership/state must also be checked by the caller. No upload credentials are returned. */
export async function recoverProjectCover(ownerId:number,projectId:string,submissionId:string):Promise<string> {
  let directory;try{directory=await opendir(uploadDirectory());}catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return "";throw error;}
  let found:UploadRecord|undefined;
  for await(const file of directory){
    if(!file.isFile()||!/^[-0-9a-f]{36}\.json$/.test(file.name))continue;
    let entry:UploadRecord;try{entry=JSON.parse(await readFile(path.join(uploadDirectory(),file.name),"utf8"));}catch(error){if(error instanceof SyntaxError||(error as NodeJS.ErrnoException).code==="ENOENT")continue;throw error;}
    if(entry.ownerId===ownerId&&entry.projectId===projectId&&entry.submissionId===submissionId&&typeof entry.coverUrl==="string"&&entry.coverUrl&&(!found||entry.createdAt>found.createdAt))found=entry;
  }
  return found?.coverUrl??"";
}
export async function lockUpload(id: string): Promise<() => Promise<void>> {
  const target = `${location(id)}.lock`;
  const handle = await open(target, "wx", 0o600);
  await handle.close();
  return () => unlink(target);
}
