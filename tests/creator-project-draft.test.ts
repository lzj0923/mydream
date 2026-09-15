import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { prepareAppDraft, type DraftOperation, type AcceptedEpisode } from "../src/lib/creator-video/app-draft.ts";

const accepted: AcceptedEpisode = { id: "submission-1", projectId: "project-1", episodeNumber: 2, revision: 1, title: "Second episode", description: "Accepted story", vodVideoId: "00000000000000000000000000000001", coverUrl: "https://cdn.example/cover.jpg" };
type Episode = { id: number; dramaId: number; number: number; videoId: string; status: string };
function fixture(initial?: Episode) {
  let row = initial, operation: DraftOperation | undefined, failure = "", writes = 0;
  let lastParams: URLSearchParams | undefined;
  const gateway = {
    get: async (path: string, html = false) => {
      if (!html) return { total: row ? 1 : 0, rows: row ? [{ id: row.id, status: row.status, drama_num: row.number }] : [] };
      if (path.startsWith("short/episode/edit/ids/")) return `<input name="row[drama_id]" value="${row!.dramaId}"><input name="row[drama_num]" value="${row!.number}"><input name="row[video_attachment_id]" value="${row!.videoId}"><input name="__token__" value="csrf-fixture">`;
      return '<input name="row[drama_id]"><input name="row[drama_num]"><input name="row[video_attachment_id]"><input name="__token__" value="csrf-fixture">';
    },
    post: async (path: string, body: URLSearchParams) => {
      assert.ok(path === "short/episode/add" || path === "short/episode/edit/ids/90");
      assert.equal(operation?.phase, "unknown", "persist uncertainty before any external write");
      writes++; lastParams = body;
      if (failure === "before") throw new Error("timeout");
      row = { id: 90, dramaId: Number(body.get("row[drama_id]")), number: Number(body.get("row[drama_num]")), videoId: body.get("row[video_attachment_id]")!, status: body.get("row[status]")! };
      if (failure === "after") throw new Error("timeout");
      return { code: 1 };
    },
    save: async (value: DraftOperation) => { operation = value; },
  };
  return { gateway, state: () => ({ row, operation, writes, lastParams }), fail: (value: string) => { failure = value; } };
}
test("accepted media uses the existing single-episode add action and is always a draft", async () => {
  const f = fixture(); const result = await prepareAppDraft(f.gateway, accepted, 7);
  assert.equal(result.status, "draft"); assert.equal(result.episodeId, 90);
  const params = f.state().lastParams!;
  assert.equal(params.get("row[video_url]"), `/vod/${accepted.vodVideoId}`);
  assert.equal(params.get("row[video_attachment_id]"), accepted.vodVideoId);
  assert.equal(params.get("row[drama_num]"), "2"); assert.equal(params.get("__token__"), "csrf-fixture");
  assert.equal(params.get("row[unlock_price]"), "0.00"); assert.equal(f.state().operation?.phase, "confirmed");
});
test("repeated draft preparation returns the same App ID without creating another episode", async () => {
  const f = fixture(); await prepareAppDraft(f.gateway, accepted, 7);
  const again = await prepareAppDraft(f.gateway, accepted, 7, f.state().operation);
  assert.equal(again.reused, true); assert.equal(again.episodeId, 90); assert.equal(f.state().writes, 1);
});
test("timeout after creation is recovered by reading the existing exact media", async () => {
  const f = fixture(); f.fail("after"); await assert.rejects(prepareAppDraft(f.gateway, accepted, 7), /timeout/);
  const again = await prepareAppDraft(f.gateway, accepted, 7, f.state().operation);
  assert.equal(again.episodeId, 90); assert.equal(f.state().writes, 1); assert.equal(f.state().operation?.phase, "confirmed");
});
test("uncertain write without a matching result must not be retried blindly", async () => {
  const f = fixture(); f.fail("before"); await assert.rejects(prepareAppDraft(f.gateway, accepted, 7), /timeout/);
  await assert.rejects(prepareAppDraft(f.gateway, accepted, 7, f.state().operation), /尚未確認/); assert.equal(f.state().writes, 1);
});
test("another project's draft and already published different media are never overwritten", async () => {
  const existing = { id: 90, dramaId: 7, number: 2, videoId: "old", status: "published" };
  const f = fixture(existing);
  await assert.rejects(prepareAppDraft(f.gateway, accepted, 7), /已上架/);
  await assert.rejects(prepareAppDraft(f.gateway, accepted, 7, { projectId: "other", submissionId: "old", videoId: "old", phase: "confirmed", updatedAt: "now" }), /其他項目/);
  assert.equal(f.state().writes, 0);
});
test("only a draft created by this project can receive the latest accepted revision", async () => {
  const f = fixture(); await prepareAppDraft(f.gateway, accepted, 7);
  const revised = { ...accepted, id: "submission-2", revision: 2, vodVideoId: "00000000000000000000000000000002" };
  const result = await prepareAppDraft(f.gateway, revised, 7, f.state().operation);
  assert.equal(result.episodeId, 90); assert.equal(f.state().writes, 2); assert.equal(f.state().row?.videoId, revised.vodVideoId);
  assert.equal(f.state().lastParams!.has("row[unlock_price]"), false, "preserve the administrator's existing pricing");
});
test("an App filter mismatch or duplicate episode numbers prevents every write", async () => {
  const wrong = fixture({ id: 90, dramaId: 8, number: 2, videoId: "old", status: "draft" });
  await assert.rejects(prepareAppDraft(wrong.gateway, accepted, 7), /不一致/); assert.equal(wrong.state().writes, 0);
  const duplicate = fixture(); duplicate.gateway.get = async () => ({ total: 2, rows: [{ id: 1 }, { id: 2 }] }) as never;
  await assert.rejects(prepareAppDraft(duplicate.gateway, accepted, 7), /重複集數/); assert.equal(duplicate.state().writes, 0);
});
test("a permission error HTML page is never treated as a writable App form", async () => {
  const f = fixture(); f.gateway.get = async (_path, html) => html ? "Permission denied" : { total: 0, rows: [] };
  await assert.rejects(prepareAppDraft(f.gateway, accepted, 7), /權限/); assert.equal(f.state().writes, 0);
});

test("retired cross-admin route never reads sessions or calls either backend", async () => {
  const compiled = ts.transpileModule(readFileSync("src/app/api/creator-project-drafts/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports: { POST?: (request: unknown) => Promise<{ status: number; code: string }> } = {};
  runInNewContext(compiled, { exports,
    fetch: () => { throw new Error("Must not contact either backend"); },
    require: (key: string) => {
      assert.equal(key, "next/server");
      return { NextResponse: { json: (data: { code: string }, opts: { status: number }) => ({ status: opts.status, code: data.code }) } };
    },
  });
  const request = new Proxy({}, { get: () => { throw new Error("Must not access sessions or submitted data"); } });
  const result = await exports.POST!(request);
  assert.equal(result.status, 410);
  assert.equal(result.code, "ADMIN_SYSTEMS_SEPARATED");
});
import {acceptedForPublication,priceValue,selectOptions} from '../src/lib/creator-video/publish-domain.ts';
import * as draftModule from '../src/lib/creator-video/app-draft.ts';
import {record,formToken} from '../src/lib/app-admin/domain.ts';
test('publication rejects unapproved, stale, unverified and invalid prices',()=>{
 const project={stage:'PRODUCING',publicationAllowed:true,submissions:[{...accepted,state:'APPROVED',version:3}]};
 assert.equal(acceptedForPublication(project,accepted.id,3).id,accepted.id);
 for(const value of [{...project,publicationAllowed:false},{...project,stage:'COMPLETED'},{...project,submissions:[{...accepted,state:'SUBMITTED',version:3}]},{...project,submissions:[...project.submissions,{...accepted,id:'newer',revision:2}]}])assert.throws(()=>acceptedForPublication(value,accepted.id,3));
 assert.throws(()=>acceptedForPublication(project,accepted.id,2));
 for(const price of ['-1','1.999','NaN','1000000'])assert.throws(()=>priceValue(price));assert.equal(priceValue('30'),'30.00');
 assert.deepEqual(selectOptions('<select name="type[]"><option value="1" disabled>Group</option><option value="2">Drama</option></select>','type[]'),[{value:'2',label:'Drama'}]);
});
test('platform publication authenticates App, uses approved media, publishes and links with no CMS session',async()=>{
 const compiled=ts.transpileModule(readFileSync('src/app/api/app-admin/project-publish/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 let signedIn=true,allowed=true,verified=true,episodeStatus='draft',dramaStatus='draft',writes=0,linked=0,dramaExists=true;
 const exports:{POST?:(r:unknown)=>Promise<{status:number;data:unknown}>}={};
 class AdminError extends Error{status=401;}
 runInNewContext(compiled,{exports,Headers,Buffer,URLSearchParams,AbortSignal,process:{env:{}},fetch:async(_url:string,options:{method:string;headers:Record<string,string>;body?:string})=>{
  assert.equal(options.headers.Cookie,undefined);assert.match(options.headers.Authorization,/Bearer signed/);
  if(options.method==='POST'){linked++;const data=JSON.parse(options.body!);assert.equal(data.dramaId,7);assert.equal(data.episodeId,90);}
  return {ok:true,status:200,json:async()=>({stage:'PRODUCING',publicationAllowed:verified,settings:{area:'zhf',category:'22',landscape:false,price:'30.00'},title:'Fixture',episodeCount:2,synopsis:'Fixture summary',submissions:[{...accepted,state:'APPROVED',version:3}],publications:[]})};
 },require:(key:string)=>{
  if(key==='next/server')return {NextResponse:{json:(data:unknown,o:{status:number})=>({status:o.status,data})}};
  if(key.endsWith('request-security'))return {isAllowedOrigin:()=>allowed};
  if(key.endsWith('review-token'))return {reviewToken:()=> 'signed'};
  if(key.endsWith('app-admin/domain'))return {record,formToken};
  if(key.endsWith('publish-domain'))return {acceptedForPublication,priceValue,selectOptions};
  if(key.endsWith('publication-store'))return {withProjectPublication:async(_id:string,fn:(s:unknown,save:()=>Promise<void>)=>unknown)=>fn({},async()=>{})};
  if(key.endsWith('app-draft-store'))return {withDraftOperation:async(_d:number,_n:number,fn:(s:undefined,save:()=>Promise<void>)=>unknown)=>fn(undefined,async()=>{})};
  if(key.endsWith('app-draft'))return {...draftModule,prepareAppDraft:async(_g:unknown,e:typeof accepted)=>{assert.equal(e.vodVideoId,accepted.vodVideoId);return {episodeId:90,dramaId:7,status:episodeStatus};}};
  if(key.endsWith('app-admin/server'))return {AdminError,state:async()=>{if(!signedIn)throw new AdminError('Login required');return {actor:{id:42}};},authenticated:()=>{},persist:async()=>{},exclusive:async(_s:unknown,fn:()=>unknown)=>fn(),upstream:async(_s:unknown,path:string,body?:URLSearchParams,html?:boolean)=>{
   if(html)return '<input name="__token__" value="fixture"><select name="row[area]"><option value="zhf">Taiwan</option></select><select name="type[]"><option value="22">Comic</option></select>';
   if(body){writes++;if(path==='short/drama/add'){assert.equal(body.get('row[cover_image]'),accepted.coverUrl);assert.equal(body.get('row[drama_count]'),'2');dramaExists=true;}else if(path.includes('short/episode/edit')){assert.equal(body.get('row[video_attachment_id]'),accepted.vodVideoId);assert.equal(body.get('row[unlock_price]'),'30.00');episodeStatus='published';}else if(path.includes('editstatus'))dramaStatus='published';return {code:1};}
   if(path.includes('Fixture')&&!dramaExists)return {rows:[],total:0};
   return {rows:[{id:7,status:dramaStatus}],total:1};
  }};
  throw Error(key);
 }});
 const request={headers:new Headers({origin:'http://localhost:3000'}),text:async()=>JSON.stringify({projectId:accepted.projectId,submissionId:accepted.id,version:3,dramaId:7,price:'9999',area:'en',category:'64',vodVideoId:'injected'})};
 signedIn=false;assert.equal((await exports.POST!(request)).status,401);assert.equal(writes,0);
 signedIn=true;verified=false;assert.equal((await exports.POST!(request)).status,409);assert.equal(writes,0);
 verified=true;assert.equal((await exports.POST!(request)).status,200);assert.equal(writes,2);assert.equal(linked,1);
 assert.equal((await exports.POST!(request)).status,200);assert.equal(writes,2);assert.equal(linked,2);
 dramaExists=false;episodeStatus='draft';dramaStatus='draft';
 const createRequest={...request,text:async()=>JSON.stringify({projectId:accepted.projectId,submissionId:accepted.id,version:3,price:'30',area:'zhf',category:'22'})};
 assert.equal((await exports.POST!(createRequest)).status,200);assert.equal(writes,5);assert.equal(linked,3);
 allowed=false;assert.equal((await exports.POST!(request)).status,403);assert.equal(writes,5);
});

test('completed projects can restore only the exact approved linked submission',()=>{
 const project={stage:'COMPLETED',publicationAllowed:true,submissions:[{...accepted,state:'APPROVED',version:3}],publications:[{submissionId:accepted.id}]};
 assert.equal(acceptedForPublication(project,accepted.id,3).id,accepted.id);
 assert.throws(()=>acceptedForPublication({...project,publications:[{submissionId:'another'}]},accepted.id,3));
 assert.throws(()=>acceptedForPublication({...project,stage:'CANCELLED'},accepted.id,3));
});
