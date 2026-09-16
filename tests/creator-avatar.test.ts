import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {saveAvatar,readAvatar,MAX_AVATAR_BYTES} from '../src/lib/creator-auth/avatar-store.ts';
test('avatar reencodes to 256 square, persists per account, and survives replacement',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'creator-avatar-'));process.env.CREATOR_AVATAR_DIR=dir;
 try{const jpg=await sharp({create:{width:600,height:300,channels:3,background:'#f00'}}).jpeg().toBuffer();await saveAvatar('account-a',jpg);const first=await readAvatar('account-a');assert.ok(first);const meta=await sharp(first).metadata();assert.equal(meta.width,256);assert.equal(meta.height,256);assert.equal(meta.format,'webp');assert.equal(await readAvatar('account-b'),null);
 const png=await sharp({create:{width:40,height:80,channels:3,background:'#00f'}}).png().toBuffer();await saveAvatar('account-a',png);assert.notDeepEqual(await readAvatar('account-a'),first);
 await assert.rejects(saveAvatar('account-a',Buffer.from('<svg/>')));await assert.rejects(saveAvatar('account-a',Buffer.alloc(MAX_AVATAR_BYTES+1)));await assert.rejects(readAvatar('../account-a'));assert.ok(await readAvatar('account-a'));
 }finally{delete process.env.CREATOR_AVATAR_DIR;await rm(dir,{recursive:true,force:true});}
});
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
const require=createRequire(import.meta.url);
const ts=require('typescript'),{NextRequest}=require('next/server');
test('avatar route rejects unauthenticated and cross-origin writes and writes only authenticated actor',async()=>{
 const source=readFileSync('src/app/api/creator-auth/avatar/route.ts','utf8');const exports:any={};let token:string|null=null;let saved='';
 class AuthError extends Error{status:number;constructor(message:string,status=503){super(message);this.status=status;}}
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 runInNewContext(code,{exports,Buffer,Uint8Array,AbortSignal,process,require:(name:string)=>name.endsWith('/server')&&name.includes('creator-auth')?{CreatorAuthError:AuthError,readCreatorToken:async()=>token,creatorAuthRequest:async()=>({id:'actor-a'})}:name.endsWith('avatar-store')?{MAX_AVATAR_BYTES:10,saveAvatar:async(id:string)=>{saved=id;},readAvatar:async()=>null}:name.endsWith('request-security')?{isAllowedOrigin:(r:Request)=>r.headers.get('origin')==='https://official.mydream.tw',consumeLoginAttempt:()=>true}:require(name)});
 const req=(origin='https://official.mydream.tw',body='ok')=>new NextRequest('https://official.mydream.tw/api/creator-auth/avatar?id=victim',{method:'POST',headers:{origin},body});
 assert.equal((await exports.POST(req())).status,401);token='valid';assert.equal((await exports.POST(req('https://evil.test'))).status,403);assert.equal(saved,'');assert.equal((await exports.POST(req(undefined,'12345678901'))).status,413);assert.equal((await exports.POST(req())).status,200);assert.equal(saved,'actor-a');
});

