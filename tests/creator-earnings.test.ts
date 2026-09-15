import test from "node:test";
import assert from "node:assert/strict";
import {earningsSummary,loadWithdrawals} from "../src/lib/creator-settlement/summary.ts";
test("income and cash stay separate, decimals exact, rejected payouts excluded",()=>{
 const base={id:"1",createdAt:"2026-09-01",amount:"300",description:"",method:"",reason:""};
 const value=earningsSummary([{id:"r",date:"2026-09-01",amount:"0.1"},{id:"s",date:"2026-09-02",amount:"0.2"}],true,{complete:true,rows:[{...base,status:"待處理",actualAmount:"1.20"},{...base,id:"2",status:"已打款",actualAmount:"2.30"},{...base,id:"3",status:"已拒絕",actualAmount:"90"}]});
 assert.equal(value.income,"0.3");assert.equal(value.pending,"1.20");assert.equal(value.paid,"2.30");assert.deepEqual(value.months,[{month:"2026-09",amount:"0.3"}]);
});
test("unavailable sources remain unknown while real empty sources show zero",()=>{
 assert.equal(earningsSummary(null,false,null).income,null);assert.equal(earningsSummary(null,false,null).paid,null);
 const empty=earningsSummary([],true,{rows:[],complete:true});assert.equal(empty.income,"0");assert.equal(empty.paid,"0");
});
test("withdrawal loader verifies every owner and reports incomplete pagination",async()=>{
 await assert.rejects(()=>loadWithdrawals(1,async()=>({total:1,data:[{id:1,user_id:2}]})),/歸屬/);
 const loaded=await loadWithdrawals(1,async()=>({total:999,data:[{id:1,user_id:1,status:1,actual_amount:"10.00"}]}));assert.equal(loaded.complete,false);assert.equal(loaded.rows.length,1);
});
