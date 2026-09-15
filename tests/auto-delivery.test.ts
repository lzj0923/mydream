import test from 'node:test';
import {submitWhenProcessed} from '../src/lib/creator-video/processing.ts';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function submission(fail:boolean|string = false) {
 const source=readFileSync('src/components/creator-workspace/video-manager.tsx','utf8');
 const snippet=source.slice(source.indexOf('  async function submitUploaded()'),source.indexOf('  async function deleteVideo()'));
 const calls:string[]=[]; const phases:string[]=[];
 let reject=fail;
 const context:any={processingController:{current:null},AbortController,submitWhenProcessed:(submit:()=>Promise<unknown>,opts:Parameters<typeof submitWhenProcessed>[1])=>submitWhenProcessed(submit,{...opts,wait:async()=>{}}),permissions:{member:false,canEdit:true,canUpload:true,canSubmit:true},credentials:{current:{uploadId:'u1'}},submittingUpload:{current:null},submittedUpload:{current:null},cover:{},coverSaved:{current:null},mounted:{current:true},title:'第2集',description:'故事',deliveryNote:'完成',projectId:'p1',episodeNumber:2,FormData:class{set(){}},setPhase:(p:string)=>phases.push(p),setError:()=>{},setEpisodeSubmissions:()=>{},setProjectRevision:()=>{},refresh:()=>Promise.resolve(),videoApi:async(path:string)=>{calls.push(path);if(path.endsWith('/delivery')&&reject){reject=false;throw Object.assign(Error('暫時失敗'),{code:typeof fail==='string'?fail:'VIDEO_ERROR'});}}};
 runInNewContext(ts.transpileModule(snippet,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+';globalThis.submit=submitUploaded;',context);
 return {context,calls,phases};
}
test('delivery saves cover before submitting and ignores concurrent and completed callbacks',async()=>{
 const {context,calls,phases}=submission();
 await Promise.all([context.submit(),context.submit()]); await context.submit();
 assert.deepEqual(calls,['/uploads/u1/cover','/uploads/u1/delivery']);
 assert.deepEqual(phases,['publishing','published']);
});
test('failed automatic delivery retries without reuploading video or cover',async()=>{
 const {context,calls,phases}=submission(true);
 await context.submit(); assert.equal(phases.at(-1),'uploaded');
 await context.submit(); assert.equal(phases.at(-1),'published');
 assert.deepEqual(calls,['/uploads/u1/cover','/uploads/u1/delivery','/uploads/u1/delivery']);
});
test('cloud processing automatically submits the same uploaded video when ready',async()=>{
 const {context,calls,phases}=submission('MEDIA_PROCESSING');
 await context.submit();assert.deepEqual(phases,['publishing','processing','published']);
 assert.deepEqual(calls,['/uploads/u1/cover','/uploads/u1/delivery','/uploads/u1/delivery']);
});
test('cloud failure and ambiguous network errors never retry automatically',async()=>{
 for(const code of ['MEDIA_PROCESSING_FAILED','MEDIA_STATUS_UNKNOWN','VIDEO_ERROR']){
  const {context,calls,phases}=submission(code);await context.submit();assert.equal(phases.at(-1),'uploaded');assert.equal(calls.length,2);
 }
});
test('processing wait is bounded and can be cancelled before another submission',async()=>{
 const pending=()=>Object.assign(new Error('processing'),{code:'MEDIA_PROCESSING'});
 let calls=0;const controller=new AbortController();
 await assert.rejects(submitWhenProcessed(async()=>{calls++;throw pending();},{signal:controller.signal,onWaiting:()=>{},maxAttempts:3,wait:async()=>{}}),/無需重新上傳/);assert.equal(calls,3);
 calls=0;await assert.rejects(submitWhenProcessed(async()=>{calls++;throw pending();},{signal:controller.signal,onWaiting:()=>controller.abort(),wait:async()=>{}}));assert.equal(calls,1);
});
test('project proxy preserves processing codes for the browser retry policy',async()=>{
 class VideoApiError extends Error {status:number;code:string;constructor(message:string,status:number,code:string){super(message);this.status=status;this.code=code;}}
 const exports:any={};
 runInNewContext(ts.transpileModule(readFileSync('src/lib/creator-video/project-server.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,process:{env:{CMS_API_URL:'http://cms.test'}},AbortSignal,fetch:async()=>({ok:false,status:409,json:async()=>({code:'MEDIA_PROCESSING',detail:'processing'})}),require:(name:string)=>name==='server-only'?{}:name.endsWith('creator-auth/server')?{readCreatorToken:async()=>'fixture'}:{VideoApiError}});
 await assert.rejects(exports.projectRequest('fixture','projects/p/episodes/e/submit',{}),(e:any)=>e.status===409&&e.code==='MEDIA_PROCESSING');
});
test('delivery and draft endpoints return cloud status codes without marking uploads delivered',async()=>{
 for(const action of ['delivery','draft']){
  class VideoApiError extends Error {status=409;code='MEDIA_PROCESSING';}
  let saved=0,unlocked=0;const exports:any={};
  runInNewContext(ts.transpileModule(readFileSync(`src/app/api/creator-videos/uploads/[id]/${action}/route.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:(name:string)=>{
   if(name==='next/server')return {NextResponse:{json:(body:unknown,options:{status:number})=>({body,status:options?.status??200})}};
   if(name.endsWith('request-security'))return {isAllowedOrigin:()=>true};
   if(name.endsWith('response'))return {publicErrorMessage:()=> 'processing'};
   if(name.endsWith('domain'))return {record:(r:unknown)=>r,videoMetadata:(r:unknown)=>r};
   if(name.endsWith('project-server'))return {projectRequest:async()=>{throw new VideoApiError('processing');}};
   if(name.endsWith('server'))return {videoViewer:async()=>({token:'fixture',user:{id:1}}),VideoApiError};
   if(name.endsWith('store'))return {ownedUpload:async()=>({projectId:'p',submissionId:'e',state:'draft',coverUrl:'https://cdn.test/cover.jpg'}),lockUpload:async()=>()=>{unlocked++;},saveUpload:async()=>{saved++;}};
   throw Error(name);
  }});
  const result=await exports.POST({json:async()=>({title:'video',note:'submit'})},{params:Promise.resolve({id:'u'})});assert.equal(result.status,409);assert.equal(result.body.code,'MEDIA_PROCESSING');assert.equal(saved,0);assert.equal(unlocked,1);
 }
});
