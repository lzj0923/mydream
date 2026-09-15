import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {writeFileSync,openSync,closeSync} from 'node:fs';
const output='.data/creator-full-qa-20260914';
let mode='normal';const calls=[];
const rows=[{id:801,status:0,amount:'100',actual_amount:'10.00'},{id:802,status:2,amount:'200',actual_amount:'20.00',reason:'測試：資料不完整'},{id:803,status:1,amount:'300',actual_amount:'30.00',payment_reference:'QA-PAID-803',processed_at:'2026-09-14 10:00:00'}].map(r=>({...r,user_id:900001,withdrawal_type:1,withdrawal_method:2,created_at:'2026-09-14 09:00:00',bank_data:'PRIVATE-BANK',token:'PRIVATE-TOKEN'}));
const mock=createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');calls.push({path:u.pathname,method:req.method});res.setHeader('Content-Type','application/json');
 const reply=(data,status=200)=>{res.statusCode=status;res.end(JSON.stringify(data));};
 if(req.method!=='GET')return reply({detail:'No writes in financial QA'},405);
 if(u.pathname==='/creator-api/v1/auth/app-session')return mode==='member'?reply({detail:'Finance forbidden',code:'TEAM_PERMISSION_DENIED'},403):reply({token:'synthetic-app',userId:900001});
 if(u.pathname==='/creator-api/v1/project-publications')return reply([]);
 if(req.headers.token!=='synthetic-app')return reply({code:401,msg:'bad token'});
 if(mode==='expired')return reply({code:401,msg:'expired'});
 if(mode==='forbidden')return reply({code:403,msg:'forbidden'},403);
 if(mode==='network'){res.statusCode=503;return res.end('unavailable');}
 if(u.pathname==='/api/user/userInfo')return reply({code:1,data:{id:900001,username:'synthetic',score:mode==='missing-balance'?null:'1000.00'}});
 if(u.pathname==='/api/user/getScoreConsumptionHistory')return reply({code:1,data:{total:0,data:[]}});
 if(u.pathname==='/api/user/getUserWithdrawal')return reply({code:1,data:mode==='malformed'?{total:1}: {total:rows.length,data:rows.map(r=>({...r,user_id:mode==='wrong-owner'?900002:r.user_id}))}});
 reply({code:0,msg:'Unknown test route'},404);
});
await new Promise(r=>mock.listen(3069,'127.0.0.1',r));
const fd=openSync(output+'/settlement-next.log','w');
const app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3068'],{env:{...process.env,LOCAL_SHARED_CREATOR:'false',APP_AUTH_API_URL:'http://127.0.0.1:3069',CMS_API_URL:'http://127.0.0.1:3069'},stdio:['ignore',fd,fd],windowsHide:true});
const results=[];const get=(path='/api/creator-settlement?tab=withdrawals',authenticated=true)=>fetch('http://127.0.0.1:3068'+path,{headers:authenticated?{cookie:'md_creator_session=synthetic-creator'}:{}});
const passed=s=>{results.push(s);console.log('PASS '+s)};
try{
 let ready=false;for(let i=0;i<90;i++){try{if((await fetch('http://127.0.0.1:3068/healthz')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}assert.ok(ready,'isolated server ready');
 assert.equal((await get(undefined,false)).status,401);passed('unauthenticated access denied');
 let r=await get();assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');let data=await r.json();
 assert.deepEqual(data.items.map(r=>r.status),['待處理','已拒絕','已打款']);assert.equal(data.items[1].reason,'測試：資料不完整');assert.equal(data.items[2].paymentReference,'QA-PAID-803');assert.equal(data.items[2].processedAt,'2026-09-14 10:00:00');assert.equal(data.items[2].actualAmount,'30.00');assert.ok(!JSON.stringify(data).includes('PRIVATE-'));passed('pending, rejection reason, paid receipt and exact amount displayed; private bank fields removed');
 data=await(await get('/api/creator-settlement/summary')).json();assert.equal(Number(data.pending),10);assert.equal(Number(data.paid),30);passed('rejected requests excluded from pending and paid totals');
 for(const [scenario,expected] of [['member',403],['expired',409],['forbidden',403],['network',503],['wrong-owner',502],['malformed',502]]){
  mode=scenario;r=await get();if(scenario==='network')assert.ok(r.status>=500);else assert.equal(r.status,expected,scenario);data=await r.json();assert.ok(data.message);if(scenario==='expired')assert.equal(data.code,'APP_REAUTH_REQUIRED');if(scenario==='forbidden')assert.equal(data.code,'APP_PERMISSION_DENIED');if(scenario==='network')assert.equal(data.code,'APP_CONNECTION_UNAVAILABLE');assert.ok(!('items'in data),scenario);passed(scenario+' is an explicit error, never empty financial data');
 }
 mode='missing-balance';data=await(await get()).json();assert.equal(data.balance,null);passed('missing balance remains unknown');
 assert.ok(calls.every(c=>c.method==='GET'));writeFileSync(output+'/settlement-http-results.json',JSON.stringify({results,appWrites:0},null,2));
}finally{app.kill();mock.closeAllConnections();await new Promise(r=>mock.close(r));closeSync(fd);}
