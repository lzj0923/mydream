import test from "node:test";
import assert from "node:assert/strict";
import {requestTeamAction} from "../src/lib/creator-team/actions.ts";
test("successful invitation returns explicit recipient feedback and updated roster",async()=>{
 const old=global.fetch;global.fetch=async()=>new Response(JSON.stringify({members:[{state:"INVITED"}]}));
 try{const result=await requestTeamAction("invite",{account:"member_demo"});assert.equal(result.message,"邀請已發送給 member_demo，等待對方接受。");assert.equal(result.data.members[0].state,"INVITED");}finally{global.fetch=old;}
});
test("failed invitation does not return success and preserves server error",async()=>{
 const old=global.fetch;global.fetch=async()=>new Response(JSON.stringify({detail:"此賬號已受邀或已加入公司"}),{status:409});
 try{await assert.rejects(()=>requestTeamAction("invite",{account:"member_demo"}),/此賬號已受邀/);}finally{global.fetch=old;}
});
test("permission saves and removals have distinct feedback",async()=>{
 const old=global.fetch;global.fetch=async()=>new Response("{}");
 try{assert.match((await requestTeamAction("member",{action:"PERMISSIONS"})).message,/已保存並生效/);assert.match((await requestTeamAction("member",{action:"REMOVE"})).message,/已移除/);}finally{global.fetch=old;}
});
