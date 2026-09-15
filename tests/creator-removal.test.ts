import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import ts from "typescript";

type Node={type:unknown;props:Record<string,any>};
function harness(action:string,options:{admin?:boolean;member?:boolean;state?:string;failure?:string}={}){
 const hooks:any[]=[{action,version:3,requests:options.state?[{id:"r",submissionId:"",state:options.state,reason:"remove",version:2}]:[]}];let cursor=0,changed=0,removed=0;
 const calls:{url:string;body:any}[]=[];
 const exports:any={};const source=ts.transpileModule(readFileSync("src/components/creator-workspace/content-removal.tsx","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 runInNewContext(source,{exports,require:(name:string)=>{
  if(name==="react")return {useEffect:()=>{},useState:(initial:any)=>{const i=cursor++;if(!(i in hooks))hooks[i]=initial;return [hooks[i],(next:any)=>{hooks[i]=typeof next==="function"?next(hooks[i]):next;}];}};
  if(name==="react/jsx-runtime")return {jsx:(type:unknown,props:Node["props"])=>({type,props}),jsxs:(type:unknown,props:Node["props"])=>({type,props}),Fragment:"fragment"};
  if(name.endsWith("company-team"))return {useCompanyPermissions:()=>({member:!!options.member})};throw Error(name);
 },fetch:async(url:string,request:{body:string})=>{calls.push({url,body:JSON.parse(request.body)});return {ok:!options.failure,json:async()=>options.failure?{detail:options.failure}:{removed:action==="DELETE"}};}});
 function render():Node|null{cursor=0;const node=exports.ContentRemoval({projectId:"p",admin:!!options.admin,onChanged:()=>changed++,onRemoved:()=>removed++});return node?node.type(node.props):null;}
 function nodes(node:any):Node[]{if(!node||typeof node!=="object")return [];if(Array.isArray(node))return node.flatMap(nodes);return [node,...nodes(node.props?.children)];}
 function text(node:any):string{if(node===null||node===undefined||typeof node==="boolean")return "";if(typeof node!=="object")return String(node);if(Array.isArray(node))return node.map(text).join("");return text(node.props?.children);}
 const button=(label:string)=>{const node=nodes(render()).find(n=>n.type==="button"&&text(n)===label);assert.ok(node,`missing button ${label}`);return node;};
 return {render,calls,button,text,setNote:(note:string)=>{const field=nodes(render()).find(n=>n.type==="textarea");assert.ok(field);field.props.onChange({target:{value:note}});},changed:()=>changed,removed:()=>removed};
}
const flush=()=>new Promise<void>(resolve=>setImmediate(resolve));
test("draft deletion needs explicit confirmation and refreshes the project list after success",async()=>{
 const h=harness("DELETE");h.button("刪除草稿項目").props.onClick();assert.equal(h.calls.length,0);
 h.button("確認刪除草稿項目").props.onClick();await flush();assert.equal(h.calls.length,1);assert.equal(h.calls[0].url,"/api/creator/projects/p/removal");assert.equal(h.calls[0].body.action,"DELETE");assert.equal(h.calls[0].body.version,3);assert.equal(h.removed(),1);
});
test("request requires a reason and leaves published content in place",async()=>{
 const h=harness("REQUEST");h.button("申請下架").props.onClick();assert.equal(h.button("確認申請下架").props.disabled,true);
 h.setNote("停止發佈");assert.equal(h.button("確認申請下架").props.disabled,false);h.button("確認申請下架").props.onClick();await flush();assert.equal(h.calls[0].body.note,"停止發佈");assert.equal(h.changed(),1);assert.equal(h.removed(),0);
});
test("failed offline verification remains visible and never reports completion",async()=>{
 const h=harness("NONE",{admin:true,state:"ACCEPTED",failure:"App 仍有已上架劇集"});h.setNote("核對下架");h.button("核對 App 下架並完成").props.onClick();await flush();assert.match(h.text(h.render()),/App 仍有已上架劇集/);assert.equal(h.changed(),0);assert.equal(h.calls[0].url,"/api/creator/project-reviews/p/removal/r");
});
test("company members do not see owner removal controls",()=>{assert.equal(harness("DELETE",{member:true}).render(),null);});
