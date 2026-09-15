import test from "node:test";
import assert from "node:assert/strict";
import {projectIncome} from "../src/lib/creator-settlement/project-income.ts";
const ref={projectId:"p1",dramaId:7,episodeId:90,episodeNumber:1,projectTitle:"Test"};
const row={id:"1",date:"2026-09-12",amount:"1.25",dramaId:7,episodeId:90,attributionBasis:"settlement-1"};
test("only verified episode references count as project income; decimals stay exact",()=>{
 const data=projectIncome([row,{...row,id:"2",amount:"0.1"},{id:"3",date:"",amount:"10.50"}],[ref],true);
 assert.equal(data.items[0].amount,"1.35");assert.equal(data.unattributed,"10.50");assert.equal(data.available,true);
});
test("missing basis, foreign episodes and ambiguous project mappings stay unattributed",()=>{
 assert.equal(projectIncome([{...row,attributionBasis:""}],[ref],false).available,false);
 assert.equal(projectIncome([{...row,episodeId:91}],[ref],false).available,false);
 assert.equal(projectIncome([row],[ref,{...ref,projectId:"another"}],true).available,false);
 assert.equal(projectIncome([row],[],false).complete,false);
});
