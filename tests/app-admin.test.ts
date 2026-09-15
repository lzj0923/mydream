import test from 'node:test';
import assert from 'node:assert/strict';
import { moduleKey, projectRow, editFields, formToken } from '../src/lib/app-admin/domain.ts';
test('App admin resources cannot select arbitrary upstream routes',()=>{assert.equal(moduleKey('users'),'users');for(const key of ['../auth/admin','toString','__proto__','recharge'])assert.throws(()=>moduleKey(key));});
test('User projection never returns credentials, tokens or unrequested financial fields',()=>{const row=projectRow('users',{id:1,nickname:'A',email:'a@example.test',password:'secret',salt:'secret',token:'secret',money:500,bank_account:'secret'});assert.deepEqual(row,{id:1,nickname:'A',email:'a@example.test'});});
test('Editor cannot mutate ownership, attachments or payment fields',()=>{for(const field of ['admin_id','user_id','video_attachment_id','money','status','__proto__'])assert.throws(()=>editFields('videos',JSON.parse(`{"${field}":"x"}`)));assert.deepEqual(editFields('videos',{title:' New ',description:'Text'}),{title:'New',description:'Text'});assert.throws(()=>editFields('episodes',{title:'x'.repeat(241)}));});
test('FastAdmin form token supports attribute order and quote variants',()=>{assert.equal(formToken('<input value="abc123" type="hidden" name="__token__" />'),'abc123');assert.equal(formToken("<input name='__token__' value='def'/>"),'def');assert.equal(formToken('<input name="other" value="x">'),'');});
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
test('App login bootstraps missing sessions and preserves failed-login handshake; logout stays protected',async()=>{
 const code=ts.transpileModule(readFileSync('src/app/api/app-admin/session/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 const exports:{POST?:(request:unknown)=>Promise<{status:number;body:Record<string,unknown>}>}={};
 class AdminError extends Error{status:number;constructor(message:string,status=400){super(message);this.status=status;}}
 let reject=false,prepared=0,persisted=0,discarded=0;const createFlags:boolean[]=[];
 runInNewContext(code,{exports,URLSearchParams,require:(key:string)=>{
  if(key==='node:crypto')return {randomBytes:()=>({toString:()=> 'rotated-session'})};
  if(key==='next/server')return {};
  if(key.endsWith('request-security'))return {isAllowedOrigin:()=>true,consumeLoginAttempt:()=>true,clientAddress:()=> 'local'};
  if(key.endsWith('domain'))return {record:(x:unknown)=>x};
  if(key.endsWith('server'))return {AdminError,state:async(create=false)=>{createFlags.push(create);if(!create)throw new AdminError('Missing session',401);return {id:'new',token:'',expires:0};},persist:async()=>{persisted++;},prepare:async()=>{prepared++;},response:(_s:unknown,body:Record<string,unknown>,status=200)=>({body,status}),upstream:async()=>{if(reject)throw new AdminError('Invalid credentials');return {data:{id:7,username:'fixture'}};},discard:async()=>{discarded++;},exclusive:async(_s:unknown,fn:()=>unknown)=>fn(),errorResponse:(e:AdminError)=>({status:e.status,body:{message:e.message}})};
  throw Error(key);
 }});
 const request=(body:unknown)=>({headers:new Headers(),json:async()=>body});
 const ok=await exports.POST!(request({username:'fixture',password:'synthetic-password'}));assert.equal(ok.status,200);assert.ok(ok.body.user);assert.equal(createFlags[0],true);assert.equal(prepared,1);assert.equal(discarded,1);
 reject=true;const failed=await exports.POST!(request({username:'fixture',password:'synthetic-password'}));assert.equal(failed.status,400);assert.equal(failed.body.message,'Invalid credentials');assert.equal(persisted,2);
 const logout=await exports.POST!(request({action:'logout'}));assert.equal(logout.status,401);assert.equal(createFlags.at(-1),false);
});
