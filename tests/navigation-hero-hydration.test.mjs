import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function mount(mode = "true") {
  const styles = new Map();
  const body = { tagName: "BODY", children: [], parentElement: null };
  const hero = { tagName: "SECTION", parentElement: body, children: [],
    style: { getPropertyValue: k => styles.get(k), setProperty: (k,v) => styles.set(k,v) },
    getAttribute: () => mode, hasAttribute: () => true, getBoundingClientRect: () => ({top: 0}) };
  body.children.push(hero);
  let height = 186, frame, effect, css, resize, mutation, present = true, disconnected = false, removed = false;
  const copy = { closest: () => hero, getBoundingClientRect: () => ({height,bottom:height}) };
  const exports = {};
  const context = { exports, require: name => {
    if (name === "react") return { useEffect: fn => {effect=fn;}, useState: initial => [initial, v => {css=(typeof v === "function" ? v(initial) : v).css;}] };
    if (name === "next/navigation") return {usePathname:()=>"/"};
    if (name === "react/jsx-runtime") return {jsx:()=>null};
    throw new Error(name);
  }, document: { body, getElementById: () => ({}), querySelectorAll: () => present ? [copy] : [] },
  window: {addEventListener(){},removeEventListener(){removed=true;}},
  requestAnimationFrame: fn => {frame=fn;return 1;}, cancelAnimationFrame:()=>{frame=undefined;},
  MutationObserver: class { constructor(fn){mutation=fn;} observe(){} disconnect(){} },
  ResizeObserver: class { constructor(fn){resize=fn;} observe(){} disconnect(){disconnected=true;} } };
  const source=fs.readFileSync('src/components/layout/navigation-hero-fit.tsx','utf8');
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);
  exports.NavigationHeroFit();const cleanup=effect();
  return {styles,flush:()=>frame?.(),css:()=>css,resize:h=>{height=h;resize();},present:v=>{present=v;mutation();},cleanup,disconnected:()=>disconnected,removed:()=>removed};
}

test("layout effect before page hydration does not mutate server-rendered hero attributes",()=>{
  const h=mount();h.flush();
  assert.equal(h.styles.size,0,"global layout must not modify a hero that may not have hydrated yet");
  assert.match(h.css(),/--nav-fit-height:266px/);
  h.cleanup();assert.ok(h.disconnected() && h.removed());
});

test("column and flow heroes remain outside automatic height fitting",()=>{
 for(const mode of ['columns','flow']) {const h=mount(mode);h.flush();assert.equal(h.styles.size,0);assert.ok(!h.css()?.includes('--nav-fit-height'));h.cleanup();}
});

test("resizing and late streamed hero content update height without mutating page attributes",()=>{
 const h=mount();h.present(false);h.flush();assert.equal(h.css(),"");
 h.present(true);h.flush();assert.match(h.css(),/body > section:nth-child\(1\).*266px/);
 h.resize(800);h.flush();assert.match(h.css(),/880px/);assert.equal(h.styles.size,0);
 h.cleanup();h.resize(900);h.flush();assert.match(h.css(),/880px/);
});
