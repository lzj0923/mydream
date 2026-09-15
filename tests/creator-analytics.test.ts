import assert from "node:assert/strict";
import test from "node:test";
import {analyticsRows,counter,rewardPage,sumRewards,totalMetric,filterVideos,csvCell} from "../src/lib/creator-analytics.ts";
const video={id:1,user_id:452,title:"作品",createtime:1788739200,view_count:12,like_count:0};
test("current owner only and unavailable metrics stay unavailable",()=>{
 assert.throws(()=>analyticsRows([video],453,"https://assets.example"));
 const rows=analyticsRows([video],452,"https://assets.example");
 assert.equal(totalMetric(rows,"views"),12);assert.equal(totalMetric(rows,"comments"),null);
 for(const value of [false,true,null,undefined," ",-1,"1.5",{}])assert.equal(counter(value),null);
 assert.equal(counter("0"),0);
 assert.equal(filterVideos(rows,7,"不存在",Date.now()).length,0);
});
test("only creator sharing rewards count; descriptions cannot impersonate category",()=>{
 const row={id:1,user_id:452,type:1,score:"0.1",memo:"創作者分潤獎勵",created_at:"2026-09-07 12:00:00"};
 const page=rewardPage({total:4,data:[row,{...row,id:2,score:"0.2"},{...row,id:3,memo:"邀请奖励",description:"創作者分潤獎勵"},{...row,id:4,type:2}]},452);
 assert.equal(page.rewards.length,2);assert.equal(sumRewards(page.rewards),"0.3");
 assert.throws(()=>rewardPage({total:1,data:[{...row,user_id:453}]},452));
 assert.equal(sumRewards([{id:"1",date:"",amount:"9007199254740993.01"},{id:"2",date:"",amount:"0.09"}]),"9007199254740993.10");
 assert.equal(sumRewards([]),"0");
});
test("exports neutralize spreadsheet formulas",()=>{
 assert.equal(csvCell('=HYPERLINK("x")'),'"\'=HYPERLINK(""x"")"');
 assert.equal(csvCell(null),'"未提供"');
});

import {projectEpisodeRow} from "../src/lib/creator-analytics.ts";
import {loadCreatorRewards} from "../src/lib/creator-rewards.ts";
test("published project metrics match the linked episode and missing income is not fabricated",()=>{
 const ref={episodeId:31,episodeNumber:2,projectTitle:"Project"};
 const result=projectEpisodeRow(ref,{id:31,drama_num:2,title:"Episode",views:12,likes:3,comment_num:1,status:"published"},"https://assets.example");
 assert.equal(result.id,"episode:31");assert.equal(result.views,12);assert.equal(result.collections,null);
 assert.throws(()=>projectEpisodeRow(ref,{id:32,drama_num:2},"https://assets.example"));
 assert.throws(()=>projectEpisodeRow(ref,{id:31,drama_num:3},"https://assets.example"));
});
test("live ledger reader handles empty accounts, later credits, pagination and errors",async()=>{
 let credited=false;
 const read=async()=>({total:credited?1:0,data:credited?[{id:1,user_id:452,type:1,score:"30.50",memo:"創作者分潤獎勵",created_at:"2026-09-09 12:00:00"}]:[]});
 assert.equal(sumRewards((await loadCreatorRewards(452,read)).rewards),"0");
 credited=true;assert.equal(sumRewards((await loadCreatorRewards(452,read)).rewards),"30.50");
 const calls:number[]=[];
 const result=await loadCreatorRewards(452,async page=>{calls.push(page);return {total:101,data:page===1?Array.from({length:100},(_,i)=>({id:i,user_id:452,type:1,score:"1",memo:"邀请奖励"})):[{id:101,user_id:452,type:1,score:"2.25",memo:"創作者分潤獎勵"}]};});
 assert.deepEqual(calls,[1,2]);assert.equal(sumRewards(result.rewards),"2.25");assert.equal(result.rewardsComplete,true);
 await assert.rejects(loadCreatorRewards(452,async()=>{throw Error("App unavailable");}));
 await assert.rejects(loadCreatorRewards(453,read));
});

import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {memberRoles,hasPermission} from '../src/lib/creator-team/roles.ts';
test('member traffic endpoint never requests or returns financial data and checks export separately',async()=>{
 const code=ts.transpileModule(readFileSync('src/app/api/creator-traffic/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 let allowed=true,purpose='',calls:string[]=[];
 class ApiError extends Error{status=403;}
 const exports:{GET?:(r:{url:string})=>Promise<{status:number;data:unknown}>}={};
 runInNewContext(code,{exports,URL,Date,Set,process:{env:{}},require:(key:string)=>{
  if(key==='next/server')return {NextResponse:{json:(data:unknown,o:{status?:number})=>({data,status:o.status||200})}};
  if(key.endsWith('creator-video/server'))return {VideoApiError:ApiError,appData:(v:unknown)=>v,videoViewer:async(p:string)=>{purpose=p;if(!allowed)throw new ApiError('Denied');return {token:'synthetic',user:{id:452}};}};
  if(key.endsWith('upstream'))return {callAppApi:async(path:string)=>{calls.push(path);if(path.includes('getCreatorInfo'))return {id:452,fansNum:2};if(path.includes('myVideo'))return [video];throw Error('Unexpected upstream '+path);}};
  if(key.endsWith('domain'))return {record:(v:unknown)=>v};
  if(key.endsWith('creator-analytics'))return {analyticsRows,counter};
  if(key.endsWith('project-analytics'))return {projectAnalytics:async()=>({videos:[],projectComplete:true})};
  throw Error('Unexpected dependency '+key);
 }});
 const result=await exports.GET!({url:'https://example.test/api/creator-traffic'});assert.equal(result.status,200);assert.equal(purpose,'TRAFFIC');assert.equal(calls.length,1);assert.equal(calls.some(path=>path.includes("myVideo")),false);assert.doesNotMatch(JSON.stringify(result.data),/rewards|balance|bank|points|income/);
 await exports.GET!({url:'https://example.test/api/creator-traffic?export=1'});assert.equal(purpose,'TRAFFIC_EXPORT');
 const before=calls.length;allowed=false;assert.equal((await exports.GET!({url:'https://example.test/api/creator-traffic'})).status,403);assert.equal(calls.length,before);
 assert.equal(hasPermission({member:true,canEdit:true,canUpload:true,canSubmit:true},'traffic.view'),false);
 assert.equal(memberRoles.OPERATOR.permissions.includes('traffic.view'),true);
});
