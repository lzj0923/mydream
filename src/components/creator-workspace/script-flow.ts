import type { CreatorScript } from "./types";

export function workspaceActions(section: string) {
  return { upload: section === "home" || section === "videos", create: ["home", "scripts", "projects"].includes(section) };
}
export function savedScriptSection(script: CreatorScript): "scripts" | "projects" {
  return script.status === "SUBMITTED" || script.status === "APPROVED" ? "projects" : "scripts";
}
export function replaceSavedScript(scripts: CreatorScript[], saved: CreatorScript): CreatorScript[] {
  return [saved, ...scripts.filter(script => script.id !== saved.id)];
}
export function submissionIssue(title: string, synopsis: string, body: string): string | null {
  if (!title.trim()) return "請填寫劇本名稱";
  if (synopsis.trim().length < 20) return `投稿需要至少 20 字的故事梗概，目前 ${synopsis.trim().length} 字`;
  if (body.trim().length < 100) return `投稿需要至少 100 字的劇本正文，目前 ${body.trim().length} 字`;
  return null;
}
