import "server-only";
import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { DraftError, type DraftOperation } from "./app-draft";

export async function withDraftOperation<T>(dramaId: number, episodeNumber: number, action: (prior: DraftOperation | undefined, save: (value: DraftOperation) => Promise<void>) => Promise<T>) {
  if (!Number.isSafeInteger(dramaId) || dramaId < 1 || !Number.isInteger(episodeNumber) || episodeNumber < 1 || episodeNumber > 500) throw new DraftError("劇目或集數無效", 400);
  const directory = process.env.CREATOR_APP_DRAFT_STATE_DIR || path.join(process.cwd(), ".data", "creator-app-drafts");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const file = path.join(directory, `${dramaId}-${episodeNumber}.json`), lock = `${file}.lock`;
  let handle;
  try { handle = await open(lock, "wx", 0o600); } catch { throw new DraftError("本集正在寫入 App 草稿，請稍後核對"); }
  try {
    let prior: DraftOperation | undefined;
    try { prior = JSON.parse(await readFile(file, "utf8")); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw new DraftError("草稿操作記錄無法讀取，請聯繫平台核對", 503); }
    return await action(prior, async value => {
      const temp = `${file}.${randomUUID()}.tmp`;
      await writeFile(temp, JSON.stringify(value), { mode: 0o600 }); await rename(temp, file);
    });
  } finally { await handle.close(); await unlink(lock); }
}
