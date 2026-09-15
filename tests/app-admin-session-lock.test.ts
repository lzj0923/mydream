import test, {type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm,unlink,open} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {withSessionLock} from '../src/lib/app-admin/session-lock.ts';

async function fixture(t:TestContext){
 const dir=await mkdtemp(path.join(tmpdir(),'admin-session-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 const state={id:'test-session',actor:{id:18},expires:Date.now()+60000,jar:{PHPSESSID:'old'}};
 await writeFile(path.join(dir,state.id+'.json'),JSON.stringify(state));return {dir,state};
}
test('concurrent admin panels queue and use the latest PHP cookies',async t=>{
 const {dir,state}=await fixture(t);let release!:()=>void;
 const blocked=new Promise<void>(r=>release=r);let entered!:()=>void;
 const started=new Promise<void>(r=>entered=r);
 const first=withSessionLock(dir,{...state},async()=>{entered();await blocked;await writeFile(path.join(dir,state.id+'.json'),JSON.stringify({...state,jar:{PHPSESSID:'new'}}));});
 await started;
 const secondState={...state};const second=withSessionLock(dir,secondState,async()=>secondState.jar.PHPSESSID);
 release();await first;assert.equal(await second,'new');
});
test('queued request cannot resurrect a logged-out session',async t=>{
 const {dir,state}=await fixture(t);await unlink(path.join(dir,state.id+'.json'));
 let called=false;await assert.rejects(withSessionLock(dir,state,async()=>{called=true;}),{status:401});assert.equal(called,false);
});
test('timeout keeps the active request lock intact and reports a retryable service error',async t=>{
 const {dir,state}=await fixture(t),file=path.join(dir,state.id+'.lock');
 const held=await open(file,'wx');await held.writeFile('owner');
 try{await assert.rejects(withSessionLock(dir,state,async()=>{},10),{status:503});assert.equal(await readFile(file,'utf8'),'owner');}finally{await held.close();}
});
test('action failure releases the lock for the next request',async t=>{
 const {dir,state}=await fixture(t);
 await assert.rejects(withSessionLock(dir,state,async()=>{throw Error('upstream failed');}),/upstream failed/);
 assert.equal(await withSessionLock(dir,state,async()=>'ok'),'ok');
});

