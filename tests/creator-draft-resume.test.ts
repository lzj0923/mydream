import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {runInNewContext} from "node:vm";
import ts from "typescript";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {createUploadRecord,saveUpload,recoverProjectCover} from "../src/lib/creator-video/store.ts";
const require=createRequire(import.meta.url);
function renderDraft(state="DRAFT",latest=true){
 const compiled=ts.transpileModule(readFileSync("src/components/creator-workspace/project-episodes.tsx","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const exports:any={};runInNewContext(compiled+";exports.TestSubmission=Submission;",{exports,require:(key:string)=>{
  if(key.endsWith("company-team"))return {useCompanyPermissions:()=>({member:false,canUpload:true,canSubmit:true})};
  if(key.endsWith("content-removal"))return {ContentRemoval:()=>null};
  if(key.endsWith("resume-episode"))return {ResumeEpisode:()=>createElement("button",null,"繼續完成並提交")};
  if(key.endsWith("project")||key.endsWith("publish-episode")||key.endsWith(".css"))return {};
  return require(key);
 }});
 return renderToStaticMarkup(createElement(exports.TestSubmission,{item:{id:"e",projectId:"p",episodeNumber:1,revision:2,title:"cat",description:"",state,coverUrl:"",mediaUrl:"",note:"",version:0},admin:false,latest,producing:true,base:"projects/p",onChanged:()=>{}}));
}
test("incomplete draft has a visible disclosure and a same-version resume entry",()=>{
 const html=renderDraft();assert.match(html,/<summary/);assert.match(html,/繼續完成並提交/);
});
test("old and submitted drafts cannot expose resume controls",()=>{
 assert.doesNotMatch(renderDraft("DRAFT",false),/繼續完成並提交/);
 assert.doesNotMatch(renderDraft("SUBMITTED"),/繼續完成並提交/);
});
test("cover recovery matches owner, project and exact submission without exposing upload credentials",async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),"draft-recovery-"));const previous=process.env.CREATOR_VIDEO_STATE_DIR;process.env.CREATOR_VIDEO_STATE_DIR=directory;
 try{
  const upload=await createUploadRecord({title:"cat",description:"",filename:"cat.mp4",size:500,ownerId:7,projectId:"p",submissionId:"s",videoId:"vod",attachmentId:"1"});
  await saveUpload({...upload,coverUrl:"https://cdn.test/original.png",createdAt:Date.now()-9*86400000});
  assert.equal(await recoverProjectCover(7,"p","s"),"https://cdn.test/original.png");
  assert.equal(await recoverProjectCover(8,"p","s"),"");assert.equal(await recoverProjectCover(7,"other","s"),"");assert.equal(await recoverProjectCover(7,"p","previous-version"),"");
 }finally{if(previous===undefined)delete process.env.CREATOR_VIDEO_STATE_DIR;else process.env.CREATOR_VIDEO_STATE_DIR=previous;assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep));await rm(directory,{recursive:true});}
});
function recoveryRoute(state="DRAFT",latest=true){
 class VideoApiError extends Error {status:number;constructor(message:string,status=409){super(message);this.status=status;}}
 let recovered=0,uploaded=0,version=0;const calls:string[]=[];const exports:any={};
 const item={id:"e",state,revision:2,episodeNumber:1,version:2,title:"cat",description:"",coverUrl:"",note:""};
 runInNewContext(ts.transpileModule(readFileSync("src/app/api/creator-videos/recovery/route.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Response,File,Uint8Array,require:(name:string)=>{
  if(name==="next/server")return {NextResponse:{json:(body:unknown,options?:{status?:number})=>({body,status:options?.status??200})}};
  if(name.endsWith("request-security"))return {isAllowedOrigin:()=>true};
  if(name.endsWith("response"))return {publicErrorMessage:(e:Error)=>e.message};
  if(name.endsWith("project-server"))return {projectRequest:async(_token:string,path:string,body?:{version:number})=>{calls.push(path);if(path.endsWith("/episodes"))return {stage:"PRODUCING",submissions:[item,...(latest?[]:[{...item,id:"new",revision:3}])],publications:[]};if(path.endsWith("/metadata")){version=body!.version;return {coverUrl:"https://cdn.test/new.png",version:3};}return {};}};
  if(name.endsWith("server"))return {VideoApiError,videoViewer:async()=>({token:"fixture",user:{id:7}})};
  if(name.endsWith("store"))return {recoverProjectCover:async()=>{recovered++;return "https://cdn.test/old.png";}};
  if(name.endsWith("upload-cover"))return {uploadVideoCover:async()=>{uploaded++;return "https://cdn.test/new.png";}};
  if(name.endsWith("domain"))return {MAX_COVER_BYTES:5*1024*1024,safeMediaUrl:(s:string)=>s};throw Error(name);
 }});
 const url="http://localhost/api/creator-videos/recovery?projectId=p&submissionId=e";
 return {exports,calls,url,recovered:()=>recovered,uploaded:()=>uploaded,version:()=>version};
}
test("recovery refuses submitted and superseded drafts before reading caches or uploading",async()=>{
 for(const h of [recoveryRoute("SUBMITTED"),recoveryRoute("DRAFT",false)]){
  const r=await h.exports.GET({nextUrl:new URL(h.url)});assert.equal(r.status,409);assert.equal(h.recovered(),0);assert.equal(h.uploaded(),0);
 }
});
test("recovery restores an old cover and persists a replacement on the same CMS submission",async()=>{
 const h=recoveryRoute();const result=await h.exports.GET({nextUrl:new URL(h.url)});assert.equal(result.body.coverUrl,"https://cdn.test/old.png");
 const form=new FormData();form.set("file",new File(["fixture"],"cover.png",{type:"image/png"}));
 const r=await h.exports.POST(Object.assign(new Request(h.url,{method:"POST",body:form}),{nextUrl:new URL(h.url)}));
 assert.equal(r.status,200);assert.equal(r.body.version,3);assert.equal(h.version(),2);assert.equal(h.uploaded(),1);assert.ok(h.calls.includes("projects/p/episodes/e/metadata"));assert.ok(h.calls.includes("projects/p/episodes/e/edit-check"));assert.ok(!h.calls.some(p=>p.endsWith("/uploads")));
});
