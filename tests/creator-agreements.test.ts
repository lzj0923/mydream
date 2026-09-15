import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as contracts from "../src/lib/creator-agreements.ts";
import { isCreatorRoute, isReviewRoute } from "../src/lib/creator-review-access.ts";
const require = createRequire(import.meta.url);
const template = { kind: "MEMBERSHIP" as const, title: "合作協議（佔位文件）", body: "分成比例：【待雙方確認】", version: 1 };
const record: contracts.Agreement = { id:"contract-a", ownerKey:"app:12", scope:"membership", attempt:1, kind:"MEMBERSHIP", title:template.title, body:template.body, contextText:"創作者入駐申請", templateVersion:1, documentHash:"abc", signerName:"確認人", contact:"test@example.test", state:"PENDING", reviewNote:"", reviewer:"", createdAt:"2026-09-08T12:00:00", reviewedAt:null };
const data: contracts.AgreementData = { placeholder:true, ready:false, templates:[template,{...template,kind:"PROJECT",title:"項目確認書"}], contracts:[], projects:[{id:"project-a",title:"已審核故事",episodeCount:2,stage:"PENDING_CONTRACT"}] };
function render(initial: Record<string,unknown>, props: Record<string,unknown> = {}, component="ContractCenter") {
  const compiled=ts.transpileModule(readFileSync("src/components/creator-workspace/contract-center.tsx","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX},transformers:{before:[context=>root=>{
    const visit:ts.Visitor=node=>{
      if(ts.isVariableDeclaration(node)&&ts.isArrayBindingPattern(node.name)&&node.initializer&&ts.isCallExpression(node.initializer)){
        const first=node.name.elements[0];
        if(ts.isBindingElement(first)&&ts.isIdentifier(first.name)&&Object.hasOwn(initial,first.name.text)) return context.factory.updateVariableDeclaration(node,node.name,node.exclamationToken,node.type,context.factory.updateCallExpression(node.initializer,node.initializer.expression,node.initializer.typeArguments,[context.factory.createElementAccessExpression(context.factory.createIdentifier("initial"),context.factory.createStringLiteral(first.name.text))]));
      }
      return ts.visitEachChild(node,visit,context);
    };return ts.visitNode(root,visit) as ts.SourceFile;
  }]}}).outputText;
  const exports: Record<string,ComponentType<Record<string,unknown>>>={};
  const panels = { exports: {} };
  runInNewContext(ts.transpileModule(readFileSync("src/components/creator-workspace/workspace-panels.tsx","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:panels.exports,require:(name:string)=>name === "./creator-account" ? {CreatorAccountSettings:()=>null} : require(name)});
  runInNewContext(compiled,{exports,initial,require:(name:string)=>name.endsWith(".css")?{}:name.endsWith("creator-agreements")?contracts:name === "./workspace-panels"?panels.exports:require(name)});
  return renderToStaticMarkup(createElement(exports[component],props));
}
test("agreement administrator routes cannot accidentally use creator credentials",()=>{
  for(const route of ["contract-reviews","contract-reviews/contract-a","contract-templates/MEMBERSHIP","contract-templates/PROJECT"]){assert.equal(isReviewRoute(route),true);assert.equal(isCreatorRoute(route),true);}
  for(const route of ["contracts","contracts/check"]){assert.equal(isReviewRoute(route),false);assert.equal(isCreatorRoute(route),true);}
  for(const route of ["contracts/contract-a/approve","contract-templates/other","contract-reviews/a/extra"])assert.equal(isCreatorRoute(route),false);
});
test("downloaded placeholder escapes hostile content and does not claim formal signing",()=>{
  const html=contracts.agreementDocument({...record,title:'<script>alert(1)</script>',signerName:'<img src=x onerror=alert(1)>',reviewNote:'</dd><script>bad</script>',state:"DEMO_ACTIVE"});
  assert.doesNotMatch(html,/<script>|<img/);assert.match(html,/&lt;script&gt;/);assert.match(html,/非正式合同/);assert.match(html,/演示確認完成/);assert.match(html,/SHA-256/);
});
test("latest attempt wins regardless of API ordering without changing history",()=>{
  const rows=[{...record,attempt:2,id:"new"},record];assert.equal(contracts.latestAgreement(rows,"membership")?.id,"new");assert.equal(rows.length,2);
});
test("new creator sees readable placeholder, unchecked acknowledgements and disabled submission",()=>{
  const html=render({data,loading:false},{onboarding:true});
  assert.match(html,/申請成為創作者/);assert.match(html,/待雙方確認/);assert.match(html,/下載佔位文件/);assert.match(html,/確認人姓名/);assert.match(html,/disabled="" type="submit"/);assert.doesNotMatch(html,/checked=""/);
});
test("pending agreement displays persisted identity and blocks duplicate form",()=>{
  const html=render({data:{...data,contracts:[record]},loading:false,documentOpen:true});
  assert.match(html,/待平台確認/);assert.match(html,/test@example.test/);assert.match(html,/下載本次文件與記錄/);assert.doesNotMatch(html,/type="submit"/);
});
test("returned agreement shows reason and offers a fresh confirmation",()=>{
  const html=render({data:{...data,contracts:[{...record,state:"CHANGES_REQUESTED",reviewNote:"請修正姓名"}]},loading:false,documentOpen:true});
  assert.match(html,/請修正姓名/);assert.match(html,/重新提交演示確認/);assert.doesNotMatch(html,/checked=""/);
});
test("admin can review a selected application and open template management",()=>{
  const html=render({data:{...data,contracts:[record]},loading:false,selected:record.id},{admin:true});
  assert.match(html,/確認入駐（演示）/);assert.match(html,/退回修改/);assert.match(html,/管理佔位文件/);assert.match(html,/文件快照/);
});
test("creator gate fails closed on unavailable agreement state",()=>{
  const html=render({checked:true,ready:false,error:"服務暫時無法連接"},{required:true,children:"PRIVATE_WORKSPACE"},"ContractGate");
  assert.match(html,/重新連接/);assert.doesNotMatch(html,/PRIVATE_WORKSPACE/);
});


test("contract status badge does not inherit analytics empty-state padding",()=>{
 const html=render({data:{...data,contracts:[record]},loading:false,documentOpen:true});
 assert.match(html,/class="agreement-state agreement-PENDING"/);
 assert.doesNotMatch(html,/class="ca-state/);
 const analytics=readFileSync("src/components/creator-workspace/data-center.css","utf8");
 assert.doesNotMatch(analytics,/\.agreement-state/);
});

test("creator initially sees contract list and opens documents separately",()=>{
 const html=render({data:{...data,contracts:[record]},loading:false});
 assert.match(html,/<table/);assert.match(html,/contract-a/);assert.match(html,/查看合同/);
 assert.doesNotMatch(html,/type="submit"|test@example.test/);
});
