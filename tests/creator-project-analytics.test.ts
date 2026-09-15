import test from "node:test";
import assert from "node:assert/strict";
import {loadProjectAnalytics,projectIssueText} from "../src/lib/creator-video/project-analytics-data.ts";
import {totalMetric} from "../src/lib/creator-analytics.ts";
const ref={dramaId:723,episodeId:21222,episodeNumber:1,projectTitle:"測試項目"};
test("public App response with missing drama retains an unknown row instead of reporting zero",async()=>{
 const result=await loadProjectAnalytics([ref],"",async()=>({drama:null,episodes:{total:0,last_page:0,data:[]}}));
 assert.equal(result.projectComplete,false);
 assert.equal(result.videos.length,1);
 assert.equal(totalMetric(result.videos,"views"),null);
 assert.equal(result.projectIssues[0].reason,"not_found");
 assert.match(projectIssueText(result.projectIssues[0]),/723.*21222/);
 assert.doesNotMatch(projectIssueText(result.projectIssues[0]),/刷新/);
});
test("network failure differs from missing content and cannot turn into zero",async()=>{
 const result=await loadProjectAnalytics([ref],"",async()=>{throw Error("timeout");});
 assert.equal(result.projectIssues[0].reason,"unavailable");
 assert.match(projectIssueText(result.projectIssues[0]),/刷新/);
 assert.equal(totalMetric(result.videos,"likes"),null);
});
test("published episodes beyond old five-page cutoff load without losing metrics",async()=>{
 const calls:number[]=[];
 const result=await loadProjectAnalytics([ref,ref],"",async(id,page)=>{calls.push(page);return {drama:{id},episodes:{last_page:6,data:page===6?[{id:21222,drama_num:1,views:12,likes:3,comment_num:0}]:[]}};});
 assert.equal(calls.length,6);assert.equal(result.projectComplete,true);
 assert.equal(result.videos.length,1);assert.equal(totalMetric(result.videos,"views"),12);
});
test("mismatched episode number is never attributed to the linked project",async()=>{
 const result=await loadProjectAnalytics([ref],"",async()=>({drama:{id:723},episodes:{last_page:1,data:[{id:21222,drama_num:2,views:100}]}}));
 assert.equal(result.projectIssues[0].reason,"mismatch");assert.equal(totalMetric(result.videos,"views"),null);
});
test("one missing episode preserves good data; time limit is not reported as missing",async()=>{
 const result=await loadProjectAnalytics([ref,{...ref,episodeId:21223,episodeNumber:2}],"",async()=>({drama:{id:723},episodes:{last_page:1,data:[{id:21222,drama_num:1,views:12}]}}));
 assert.equal(result.videos.length,2);assert.equal(result.videos[0].views,12);assert.equal(totalMetric(result.videos,"views"),null);
 let clock=0;const limited=await loadProjectAnalytics([ref],"",async()=>{throw Error("must not read");},()=>clock++?21000:0);
 assert.equal(limited.projectIssues[0].reason,"limit");
});
