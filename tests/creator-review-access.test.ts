import test from 'node:test';
import assert from 'node:assert/strict';
import {isCreatorRoute,isReviewRoute,reviewFailureState} from '../src/lib/creator-review-access.ts';
test('removal endpoints preserve creator and administrator separation',()=>{
 for(const path of ['projects/p/removal','projects/p/episodes/e/removal']){assert.equal(isCreatorRoute(path),true);assert.equal(isReviewRoute(path),false);}
 for(const path of ['project-reviews/p/removal','project-reviews/p/removal/r']){assert.equal(isCreatorRoute(path),true);assert.equal(isReviewRoute(path),true);}
 for(const path of ['projects/p/removal/r','projects/p/episodes/e/removal/extra','project-reviews/p/removal/r/extra'])assert.equal(isCreatorRoute(path),false);
});
test('draft metadata and save endpoints remain creator-only and reject extra path segments',()=>{
 for(const route of ['projects/p/episodes/e/metadata','projects/p/episodes/e/draft']){assert.equal(isCreatorRoute(route),true);assert.equal(isReviewRoute(route),false);assert.equal(isCreatorRoute(route+'/extra'),false);}
});
test('only review endpoints use App administrator credentials',()=>{
  for(const route of ['project-reviews','project-reviews/script-1','reviews','reviews/script-1','interest-reviews','interest-reviews/item-1'])assert.equal(isReviewRoute(route),true);
  for(const route of ['projects','projects/1','projects/1/delivery','workspace','scripts','scripts/1/submit','profile','reviews-other','reviews/1/extra'])assert.equal(isReviewRoute(route),false);
});
test('missing role and missing login show a login state; network errors remain retryable',()=>{
  assert.equal(reviewFailureState(401),'login');assert.equal(reviewFailureState(403),'login');
  assert.equal(reviewFailureState(503),'error');assert.equal(reviewFailureState(),'error');
});
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { reviewToken } from '../src/lib/app-admin/review-token.ts';

test('App reviewer proxy uses only App session and never forwards CMS cookies',async()=>{
 const compiled=ts.transpileModule(readFileSync('src/app/api/creator/[...path]/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 let allowed=true,app=true,permission=true,calls=0;
 class AdminError extends Error{status:number;constructor(message:string,status=401){super(message);this.status=status;}}
 const exports: {GET?:(r:unknown,c:unknown)=>Promise<{status:number}>;POST?:(r:unknown,c:unknown)=>Promise<{status:number}>}={};
 runInNewContext(compiled,{exports,Headers,Buffer,AbortSignal,process:{env:{CMS_APP_REVIEW_KEY:'test-only-review-bridge-key-32-characters'}},
 fetch:async(_url:string,options:{headers:Headers})=>{calls++;assert.equal(options.headers.has('Cookie'),false);assert.match(options.headers.get('Authorization')||'',/^Bearer ar_/);return {status:200,headers:new Headers({'content-type':'application/json'}),json:async()=>[]};},
 require:(key:string)=>{
  if(key==='next/server')return {NextResponse:{json:(_data:unknown,opts:{status:number})=>({status:opts.status})}};
  if(key.endsWith('creator-review-access'))return {isReviewRoute,isCreatorRoute:()=>true};
  if(key.endsWith('creator-auth/server'))return {readCreatorToken:()=>{throw Error('Must not use creator credentials');}};
  if(key.endsWith('request-security'))return {isAllowedOrigin:()=>allowed};
  if(key.endsWith('review-token'))return {reviewToken};
  if(key.endsWith('app-admin/server'))return {AdminError,state:async()=>{if(!app)throw new AdminError('App login required');return {actor:{id:42}};},authenticated:()=>{},exclusive:async(_s:unknown,fn:()=>unknown)=>fn(),upstream:async()=>{if(!permission)throw new AdminError('Permission denied',403);return {rows:[]};},persist:async()=>{}};
  throw Error('Unexpected import '+key);
 }});
 const context={params:Promise.resolve({path:['verification-reviews']})};
 const request={method:'GET',headers:new Headers(),cookies:{get:()=>{throw Error('CMS cookies must never be read');}}};
 assert.equal((await exports.GET!(request,context)).status,200);assert.equal(calls,1);
 app=false;assert.equal((await exports.GET!(request,context)).status,401);assert.equal(calls,1);
 app=true;permission=false;assert.equal((await exports.GET!(request,context)).status,403);assert.equal(calls,1);
 allowed=false;assert.equal((await exports.POST!({...request,method:'POST',headers:new Headers({origin:'https://evil.example'})},context)).status,403);assert.equal(calls,1);
});
