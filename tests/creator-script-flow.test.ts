import assert from "node:assert/strict";
import test from "node:test";
import { workspaceActions, savedScriptSection, replaceSavedScript, submissionIssue } from "@/components/creator-workspace/script-flow";
import type { CreatorScript } from "@/components/creator-workspace/types";

test("contract and settlement pages do not inherit unrelated creation actions", () => {
  for (const section of ["contracts", "settlement", "profile", "help"]) assert.deepEqual(workspaceActions(section), { upload: false, create: false });
  assert.deepEqual(workspaceActions("scripts"), { upload: false, create: true });
  assert.deepEqual(workspaceActions("home"), { upload: true, create: true });
  assert.deepEqual(workspaceActions("videos"), { upload: true, create: false });
});
test("saved drafts are visible immediately and submitted scripts go to projects", () => {
  const draft = { id: "draft", title: "故事", status: "DRAFT", version: 1 } as CreatorScript;
  assert.equal(savedScriptSection(draft), "scripts");
  assert.deepEqual(replaceSavedScript([], draft), [draft]);
  const submitted = { ...draft, status: "SUBMITTED", version: 2 } as CreatorScript;
  assert.equal(savedScriptSection(submitted), "projects");
  assert.deepEqual(replaceSavedScript([draft], submitted), [submitted]);
});
test("submission requirements explain what is missing and accept complete manuscripts", () => {
  assert.match(submissionIssue("", "", "")!, /名稱/);
  assert.match(submissionIssue("故事", "简介", "正文")!, /20 字.*2 字/);
  assert.match(submissionIssue("故事", "字".repeat(20), "正文")!, /100 字.*2 字/);
  assert.equal(submissionIssue("故事", "字".repeat(20), "字".repeat(100)), null);
});
