import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import {submitWhenProcessed} from "../src/lib/creator-video/processing.ts";
import ts from "typescript";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as domain from "../src/lib/creator-video/domain.ts";
import * as accessState from "../src/lib/creator-video/access-state.ts";
import { projectUpload, episodeEditReason } from "../src/lib/creator-video/project.ts";
import { isCreatorRoute, isReviewRoute } from "../src/lib/creator-review-access.ts";

const require = createRequire(import.meta.url);
function renderVideoProjects(projects: { id: string; title: string; stage: string }[], overrides: Record<string,unknown> = {}) {
  const source = readFileSync("src/components/creator-workspace/video-manager.tsx", "utf8");
  const initial: Record<string, unknown> = { projects, viewer: 12, loading: false, projectsLoading: false, ...overrides };
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }, transformers: { before: [context => root => {
    const visit: ts.Visitor = node => {
      if (ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name) && node.initializer && ts.isCallExpression(node.initializer)) {
        const first = node.name.elements[0];
        if (ts.isBindingElement(first) && ts.isIdentifier(first.name) && Object.hasOwn(initial, first.name.text)) return context.factory.updateVariableDeclaration(node, node.name, node.exclamationToken, node.type, context.factory.updateCallExpression(node.initializer, node.initializer.expression, node.initializer.typeArguments, [context.factory.createElementAccessExpression(context.factory.createIdentifier("initial"), context.factory.createStringLiteral(first.name.text))]));
      }
      return ts.visitEachChild(node, visit, context);
    };
    return ts.visitNode(root, visit) as ts.SourceFile;
  }] } }).outputText;
  const exports: { VideoManager?: ComponentType<{ active: boolean }> } = {};
  runInNewContext(compiled, { exports, initial, require: (name: string) => {
    if (name.endsWith("creator-video/processing")) return {submitWhenProcessed};
    if (name === "next/link") return { default: "a" };
    if (name === "next/image") return { default: "img" };
    if (name.endsWith("company-team")) return { useCompanyPermissions: () => ({ member: false, canEdit: true, canUpload: true, canSubmit: true }) };
    if (name.endsWith("project-materials")) return { ProjectMaterials: () => null };
    if (name.endsWith("project-episodes")) return { ProjectVideoList: () => null };
    if (name.endsWith("video-duration")) return { VideoDuration: () => null };
    if (name.endsWith("creator-video/domain")) return domain;
    if (name.endsWith("creator-video/access-state")) return accessState;
    if (name.endsWith("creator-video/project")) return { projectUpload, episodeEditReason };
    return require(name);
  } });
  return renderToStaticMarkup(createElement(exports.VideoManager!, { active: true }));
}

test("approved projects awaiting contract or production remain selectable in the actual upload form", () => {
  const html = renderVideoProjects([{ id: "approved-pending", title: "已審核故事", stage: "PENDING_CONTRACT" }, { id: "approved-signed", title: "已簽約故事", stage: "SIGNED" }, { id: "producing", title: "製作故事", stage: "PRODUCING" }]);
  for (const id of ["approved-pending", "approved-signed", "producing"]) assert.match(html, new RegExp(`<option value="${id}">`));
  assert.match(html, /待簽約/); assert.match(html, /待安排製作/);
});
test("an empty project list explains direct project creation without obsolete script approval", () => {
  const html=renderVideoProjects([]);
  assert.match(html, /請先在「我的項目」建立項目並確認承諾集數/);
  assert.doesNotMatch(html,/劇本通過後會顯示/);
});
class VideoApiError extends Error { status: number; constructor(message: string, status = 400) { super(message); this.status = status; } }
type Reply = { status: number; data: Record<string, unknown> };
type Handler = (request: { json: () => Promise<unknown> }, context: { params: Promise<{ id: string }> }) => Promise<Reply>;
function route(name: string, mods: Record<string, unknown>) {
  const source = readFileSync(name === "start" ? "src/app/api/creator-videos/uploads/route.ts" : `src/app/api/creator-videos/uploads/[id]/${name}/route.ts`, "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports: { POST?: Handler } = {};
  runInNewContext(compiled, { exports, require: (key: string) => {
    if (key === "next/server") return { NextResponse: { json: (data: Record<string, unknown>, options?: { status?: number }) => ({ data, status: options?.status || 200 }) } };
    if (key.endsWith("request-security")) return { isAllowedOrigin: () => true };
    if (key.endsWith("response")) return { publicErrorMessage: (error: Error) => error.message };
    if (key.endsWith("domain")) return domain;
    if (key.endsWith("creator-video/project")) return { projectUpload, episodeEditReason };
    for (const [suffix, value] of Object.entries(mods)) if (key.endsWith(suffix)) return value;
    return require(key);
  } });
  return exports.POST!;
}
function fixture(project = true) {
  let saved = { id: "upload-id", ownerId: 12, projectId: project ? "project-a" : undefined, submissionId: project ? "submission-a" : undefined, episodeNumber: project ? 2 : undefined, videoId: "vod-00000000000001", attachmentId: "42", title: "Episode", description: "story", filename: "episode.mp4", size: 1024, coverUrl: "https://cdn.example/cover.jpg", state: "draft" };
  const calls: { path: string; body: unknown }[] = [];
  let unlocked = 0, owner = 12;
  const mods = {
    "creator-video/server": { VideoApiError, videoViewer: async () => ({ token: "fixture", user: { id: owner } }), appData: (value: { data: unknown }) => value.data },
    "creator-video/store": { ownedUpload: async (_id: string, viewer: number) => { if (viewer !== saved.ownerId) throw new Error("無權操作"); return { ...saved }; }, lockUpload: async () => async () => { unlocked++; }, saveUpload: async (value: typeof saved) => { saved = value; } },
    "creator-video/project-server": { projectRequest: async (_token: string, path: string, body: unknown) => { calls.push({ path, body }); return {}; } },
    "app-auth/upstream": { callAppApi: async (path: string, options: { body: unknown }) => { calls.push({ path, body: options.body }); return { code: 1, data: { vod_status: "completed" } }; } },
  };
  return { mods, calls, saved: () => saved, unlocked: () => unlocked, otherOwner: () => { owner = 13; } };
}
const request = { json: async () => ({ title: "Episode", description: "story", note: "delivery", projectId: "forged", episodeNumber: 99 }) };
const context = { params: Promise.resolve({ id: "upload-id" }) };

test("project selection requires a valid project and integer planned episode input", () => {
  assert.equal(projectUpload({}), undefined);
  assert.deepEqual(projectUpload({ projectId: "project-a", episodeNumber: 45 }), { projectId: "project-a", episodeNumber: 45 });
  for (const input of [{ episodeNumber: 1 }, { projectId: "../outside", episodeNumber: 1 }, { projectId: "a", episodeNumber: 0 }, { projectId: "a", episodeNumber: 501 }, { projectId: "a", episodeNumber: 1.5 }]) assert.throws(() => projectUpload(input));
});
test("nested review routes use only CMS permissions and reject arbitrary nested paths", () => {
  for (const value of ["project-reviews/a/episodes", "project-reviews/a/episodes/b/review", "project-reviews/a/episodes/b/publication", "project-reviews/a/publication-check", "project-reviews/a/complete"]) { assert.equal(isReviewRoute(value), true); assert.equal(isCreatorRoute(value), true); }
  for (const value of ["projects/a/episodes", "projects/a/episodes/b/submit", "projects/a/uploads", "projects/a/publication-check", "project-episodes"]) { assert.equal(isCreatorRoute(value), true); assert.equal(isReviewRoute(value), false); }
  for (const value of ["projects/a/episodes/b/publication", "project-reviews/a/episodes/b/submit", "reviews/a/extra", "projects/../../admin", "project-reviews/a/remove"]) assert.equal(isCreatorRoute(value), false);
});
test("project upload cannot bypass acceptance using the independent publish route", async () => {
  const f = fixture(); const response = await route("publish", f.mods)(request, context);
  assert.equal(response.status, 409); assert.equal(f.calls.length, 0); assert.equal(f.saved().state, "draft");
});
test("delivery uses persisted project identity, never adds App video and is idempotent", async () => {
  const f = fixture(); const post = route("delivery", f.mods);
  assert.equal((await post(request, context)).status, 200);
  assert.equal(f.calls[0].path, "projects/project-a/episodes/submission-a/submit");
  assert.equal((f.calls[0].body as { coverUrl: string }).coverUrl, "https://cdn.example/cover.jpg");
  assert.equal(f.saved().state, "delivered");
  assert.equal((await post(request, context)).status, 200); assert.equal(f.calls.length, 1); assert.equal(f.unlocked(), 2);
});
test("delivery rejects another account and independent uploads before calling CMS", async () => {
  const f = fixture(); f.otherOwner(); assert.notEqual((await route("delivery", f.mods)(request, context)).status, 200); assert.equal(f.calls.length, 0);
  const independent = fixture(false); assert.equal((await route("delivery", independent.mods)(request, context)).status, 400); assert.equal(independent.calls.length, 0);
});
test("existing independent publishing keeps the original App API contract", async () => {
  const f = fixture(false); assert.equal((await route("publish", f.mods)(request, context)).status, 200);
  assert.deepEqual(f.calls.map(value => value.path), ["verification/check", "/api/vod/getAttachmentInfo", "/api/video/addVideo"]);
  const body = f.calls[2].body as Record<string, unknown>;
  assert.equal(body.videoAttachmentId, "vod-00000000000001"); assert.equal(body.attachment_id, "42"); assert.equal(body.videoUrl, "/vod/vod-00000000000001"); assert.equal("projectId" in body, false);
});

test("certification gate rejects independent publish before any App calls", async () => {
  for (const endpoint of ["publish"]) {
    const f = fixture(false);
    f.mods["creator-video/project-server"].projectRequest = async () => { throw new VideoApiError("請先通過身份認證", 403); };
    const result = await route(endpoint, f.mods)(request, context);
    assert.equal(result.status, 403); assert.equal(f.calls.length, 0); assert.equal(f.saved().state, "draft");
  }
});

test("pending episode disables upload controls while other and returned episodes remain available",()=>{
 const projects=[{id:"project-a",title:"測試項目",stage:"PRODUCING"}];
 const base={projectId:"project-a",episodeCount:2,episodeNumber:1,step:2};
 const pending=renderVideoProjects(projects,{...base,episodeSubmissions:[{episodeNumber:1,state:"SUBMITTED"}]});
 assert.match(pending,/第 1 集正在審核/);
 assert.match(pending,/aria-label="選擇視頻文件" disabled=""/);
 const other=renderVideoProjects(projects,{...base,episodeNumber:2,episodeSubmissions:[{episodeNumber:1,state:"SUBMITTED"}]});
 assert.doesNotMatch(other,/aria-label="選擇視頻文件" disabled=""/);
 const returned=renderVideoProjects(projects,{...base,episodeSubmissions:[{episodeNumber:1,state:"CHANGES_REQUESTED"}]});
 assert.doesNotMatch(returned,/aria-label="選擇視頻文件" disabled=""/);
});

test("approved and published episodes disable reupload",()=>{
 for(const state of ["APPROVED","PUBLISHED"]){
 const html=renderVideoProjects([{id:"p",title:"Test",stage:"PRODUCING"}],{projectId:"p",episodeCount:2,episodeNumber:1,step:2,episodeSubmissions:[{episodeNumber:1,state}]});
 assert.match(html,/aria-label="選擇視頻文件" disabled=""/);
 }
});

test("episode edit policy allows only producing drafts or returned episodes and fails closed",()=>{
 for(const state of ["SUBMITTED","APPROVED","PUBLISHED","UNKNOWN"]){assert.ok(episodeEditReason("PRODUCING",[state]));}
 for(const state of ["DRAFT","CHANGES_REQUESTED","ARCHIVED"]){assert.equal(episodeEditReason("PRODUCING",[state]),"");}
 assert.equal(episodeEditReason("PRODUCING",[]),"");
 assert.ok(episodeEditReason("COMPLETED",["DRAFT"]));
 assert.ok(episodeEditReason("PRODUCING",["DRAFT"],true));
});
test("stale project upload cannot renew credentials or replace cover when CMS locks episode",async()=>{
 for(const action of ["refresh","cover"]){
 const f=fixture();
 f.mods["creator-video/project-server"].projectRequest=async()=>{throw new VideoApiError("本集不可編輯",409);};
 const response=await route(action,{...f.mods,"app-auth/config":{appAuthConfig:()=>({})}})(request,context);
 assert.equal(response.status,409);assert.equal(f.calls.length,0);assert.equal(f.saved().state,"draft");
 }
});

