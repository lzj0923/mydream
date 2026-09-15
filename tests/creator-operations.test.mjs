import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';import ts from 'typescript';
test('existing App API only: read finance, keep reviews in App, creator logs use CMS',async()=>{
 const code=ts.transpileModule(readFileSync('src/app/api/app-admin/operations/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 let allowed=true,signed=true,finance=false;const calls=[],exports={};let cmsReads=0;
 class AdminError extends Error{constructor(message,status=400){super(message);this.status=status;}}
 runInNewContext(code,{exports,Buffer,URLSearchParams,AbortSignal,process:{env:{}},fetch:async url=>{assert.ok(url.endsWith('/creator-api/v1/project-reviews/operations'));cmsReads++;return {ok:true,json:async()=>[{id:1,entity_type:'project',entity_id:'p'}]};},require:key=>{
  if(key==='next/server')return {NextResponse:{json:(data,opts)=>({data,status:opts?.status??200})}};
  if(key.endsWith('review-token'))return {reviewToken:()=> 'test-signature'};
  if(key.endsWith('request-security'))return {isAllowedOrigin:()=>allowed};
  if(key.endsWith('/domain'))return {record:v=>v};
  if(key.endsWith('/server'))return {AdminError,errorResponse:e=>({status:e.status??500,data:{message:e.message}}),state:async()=>({actor:{id:7}}),authenticated:()=>{if(!signed)throw new AdminError('login',401);},exclusive:async(_s,fn)=>fn(),persist:async()=>{},upstream:async(_s,path,body)=>{
   calls.push(path);assert.equal(body,undefined);assert.ok(!path.includes('creator/audit')&&!path.includes('withdrawal/edit'));
   if(path.startsWith('recharge/withdrawal/')&&!finance)throw new AdminError('No financial permission',403);
   return {rows:[{id:7,status:'0',amount:10,actual_amount:1,bank_data:'private'}],total:1};
  }};throw Error(key);
 }});
 const req=view=>({nextUrl:new URL('http://localhost/operations?view='+view)});
 signed=false;assert.equal((await exports.POST({})).status,401);signed=true;
 assert.equal((await exports.POST({})).status,405);assert.equal(calls.length,0);
 allowed=false;assert.equal((await exports.POST({})).status,403);allowed=true;
 assert.equal((await exports.GET(req('withdrawals'))).status,403);finance=true;
 const result=await exports.GET(req('withdrawals'));assert.equal(result.status,200);assert.equal(result.data.rows[0].status,'0');assert.equal(result.data.rows[0].bank_data,undefined);
 assert.equal((await exports.GET(req('audit&source=app'))).status,200);assert.equal(cmsReads,1);
});
