import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("member card generic buttons do not override the primary background",()=>{
 const css=readFileSync("src/components/creator-workspace/company-team.css","utf8");
 const rules=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
 const generic=rules.filter(([,selectors])=>selectors.split(",").some(s=>s.trim()===".ct-member button"));
 assert.ok(generic.length);
 for(const [, ,body] of generic)assert.doesNotMatch(body,/(?:^|;)\s*background(?:-color)?\s*:/,"Generic member button background hides primary white labels");
});
test("invitation keeps an accessible accept label and separate decline action",()=>{
 const component=readFileSync("src/components/creator-workspace/company-team.tsx","utf8");
 assert.match(component,/action:"ACCEPT"[^]*?>接受邀請<\/button>/);
 assert.match(component,/action:"DECLINE"[^]*?>拒絕<\/button>/);
});
