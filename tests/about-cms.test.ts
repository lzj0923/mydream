import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as aboutPlan from "../src/content/cms/about-plan.ts";
import * as managedStyle from "../src/content/cms/managed-page-style.ts";
import * as backgroundSettings from "../src/content/cms/background-page-settings.ts";

const require = createRequire(import.meta.url);

test("About managed story and character fields survive server rendering", async () => {
  for (const zone of ["story", "characters"]) {
    const html = await renderAbout({ title: "後台修改標題", description: "後台修改說明", backgroundUrl: "/updated.png", cardOneImagePosition: "right bottom" }, { titleFontSize: 42, titleColor: "#123456" }, zone);
    const section = html.slice(html.indexOf(`data-cms-zone="${zone}"`)).split("</section>")[0];
    assert.match(section, /後台修改標題/);
    assert.match(section, /後台修改說明/);
    assert.match(section, /font-size:42px/);
    if (zone === "characters") assert.match(section, /object-position:right bottom/);
  }
});

test("About hero has one video action and no obsolete secondary link", async () => {
  const html = await renderAbout({ actionLabel: "認識 My Dream", actionHref: "/universe" });
  const hero = html.split("</section>")[0];
  assert.match(hero, /認識劇有梗/);
  assert.match(hero, /href="\/video\/logo-intro-h264.mp4"/);
  assert.doesNotMatch(hero, /觀看品牌影片/);
});

test("About story clearing and positions persist after rendering saved props", async () => {
  const html = await renderAbout({ title:"", description:"", backgroundUrl:"", backgroundPosition:"right bottom" }, {}, "story");
  const story = html.slice(html.indexOf('data-cms-zone="story"')).split("</section>")[0];
  assert.doesNotMatch(story, /src="/);
  assert.match(story, /object-position:right bottom/);
  const omitted = await renderAbout({}, {}, "story");
  const cleared = omitted.slice(omitted.indexOf('data-cms-zone="story"')).split("</section>")[0];
  assert.doesNotMatch(cleared, /src="|一個夢想|開創娛樂/);
});

async function renderAbout(props: Record<string, unknown>, style = {}, zone = "hero") {
  const source = readFileSync("src/app/(frontend)/about/page.tsx", "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports: { default?: () => Promise<Parameters<typeof renderToStaticMarkup>[0]> } = {};
  runInNewContext(compiled, { exports, require: (name: string) => {
    if (name.endsWith("about-plan")) return aboutPlan;
    if (name.endsWith("about-brand-video")) return { AboutBrandVideo: ({ label, videoUrl }: {label:string;videoUrl:string}) => createElement("a", {href:videoUrl}, label) };
    if (name === "next/image") return { default: (props: Record<string, unknown>) => createElement("img", Object.fromEntries(Object.entries(props).filter(([key]) => !["fill", "priority", "unoptimized"].includes(key)))) };
    if (name === "next/link") return { default: "a" };
    if (name.endsWith("brand-logo")) return { BrandLogo: () => null };
    if (name.endsWith("java-cms-client")) return { getManagedPage: async () => ({ blocks: [{ id: zone, type: zone === "hero" ? "hero" : "feature-cards", zone, props, style }] }) };
    if (name.endsWith("managed-page-style")) return managedStyle;
    if (name.endsWith("footer-settings")) return { safeFooterHref: (href: string) => href };
    if (name.endsWith("queries") || name.endsWith("seo")) return {};
    return require(name);
  } });
  return renderToStaticMarkup(await exports.default!());
}

test("About renders saved hero copy and image instead of hardcoded content", async () => {
  const html = await renderAbout({ title: "測試主標題", subtitle: "測試副標題", description: "測試說明", actionLabel: "測試按鈕", actionHref: "/works", backgroundUrl: "/test-about-background.png", backgroundPosition: "right top" }, { titleColor: "#123456", titleFontSize: 61 });
  assert.match(html, /測試主標題/);
  assert.match(html, /測試副標題/);
  assert.match(html, /測試說明/);
  assert.match(html, /測試按鈕/);
  assert.match(html, /src="\/test-about-background.png"/);
  assert.match(html, /data-cms-field="backgroundUrl"/);
  assert.match(html, /data-cms-field="title"/);
  assert.match(html, /color:#123456;font-size:61px/);
});

test("About preserves intentionally cleared CMS fields", async () => {
  const html = await renderAbout({ title: "", subtitle: "", description: "", actionLabel: "", backgroundUrl: "" });
  const hero = html.slice(html.indexOf('<section'), html.indexOf('</section>'));
  assert.doesNotMatch(hero, /關於 <em>|AI 原創娛樂平台領者|創有梗致力於/);
  assert.doesNotMatch(hero, /src="\/assets\/jyg\/about-hero-original-world-hd.png"/);
});

test("About does not restore fallback text when publishing omits cleared fields", async () => {
  const html = await renderAbout({});
  const hero = html.slice(html.indexOf('<section'), html.indexOf('</section>'));
  assert.match(hero, /<h1 data-cms-field="title"><\/h1>/);
  assert.match(hero, /<h2 data-cms-field="subtitle"><\/h2>/);
  assert.match(hero, /<p data-cms-field="description"><\/p>/);
});

test("A slow published-page response does not overwrite the active editor draft", async () => {
  const compiled = ts.transpileModule(readFileSync("src/components/cms/visual-runtime.tsx", "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports: { CmsVisualRuntime?: (props: { apiBase: string; siteKey: string }) => void } = {};
  const selections: string[] = [];
  let receive: (event: unknown) => void = () => {};
  let resolveFetch: (value: unknown) => void = () => {};
  const response = new Promise((resolve) => { resolveFetch = resolve; });
  runInNewContext(compiled, {
    exports, AbortController, URLSearchParams, CSS: { escape: (value: string) => value },
    MutationObserver: class { observe() {} disconnect() {} },
    document: { getElementById: () => ({}), querySelectorAll: () => [], querySelector: (selector: string) => { selections.push(selector); return null; } },
    window: { location: { origin: "http://localhost:3000" }, addEventListener: (_type: string, listener: typeof receive) => { receive = listener; } },
    fetch: () => response,
    require: (name: string) => name === "react" ? { useEffect: (callback: () => void) => callback() } : name === "next/navigation" ? { usePathname: () => "/about" } : name.endsWith("background-page-settings") ? backgroundSettings : name.endsWith("about-plan") ? aboutPlan : managedStyle,
  });
  exports.CmsVisualRuntime!({ apiBase: "", siteKey: "mydream" });
  receive({ origin: "http://localhost:3000", data: { type: "cms-visual-preview", page: { blocks: [{ zone: "draft" }] } } });
  resolveFetch({ ok: true, json: async () => ({ blocks: [{ zone: "published" }] }) });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(selections, ['[data-cms-zone="draft"]']);
});

test("About story background and future plan use managed content",async()=>{
 const story=await renderAbout({backgroundUrl:"/custom-story.png"},{},"story");
 assert.match(story,/src="\/custom-story.png"/);
 const future=await renderAbout({planningTitle:"新規劃",stepFiveTitle:"第五步測試",stepFiveImageUrl:"/step-five.png"},{},"platform");
 assert.match(future,/新規劃/);assert.match(future,/第五步測試/);assert.match(future,/src="\/step-five.png"/);
});

test("About text position persists for both editable sections and bounds invalid values",async()=>{
 for(const zone of ["characters","platform"]){
 const html=await renderAbout({textOffsetX:42,textOffsetY:-28},{},zone);
 assert.match(html,/--about-text-x:42px;--about-text-y:-28px/);
 }
 assert.equal(aboutPlan.aboutTextOffset("bad"),0);
 assert.equal(aboutPlan.aboutTextOffset(9999),300);
 assert.equal(aboutPlan.aboutTextOffset(-9999),-300);
 assert.deepEqual(aboutPlan.aboutTextPosition({textOffsetX:0,textOffsetY:0}),{"--about-text-x":"0px","--about-text-y":"0px"});
});

test("all five character images use CMS values and no more-character card remains",async()=>{
 const html=await renderAbout({cardFiveImageUrl:"/changed-fifth.png",cardFiveTitle:"第五位"},{},"characters");
 assert.match(html,/src="\/changed-fifth.png"/);
 const section=html.slice(html.indexOf('data-cms-zone="characters"'),html.indexOf('data-cms-zone="platform"'));
 assert.equal((section.match(/<article/g)||[]).length,5);
 assert.match(section,/data-cms-field="cardFiveImageUrl"/);
 assert.doesNotMatch(section,/is-more|更多角色/);
});

test("About join background targets the visible invitation instead of hidden flagship", async () => {
 const html = await renderAbout({backgroundUrl:"/join-test.png",backgroundPosition:"right top"},{},"join");
 assert.match(html, /class="jyg-about-showcase__final-cta jyg-about-exact__cta" data-cms-zone="join"/);
 assert.doesNotMatch(html, /class="jyg-about-exact__flagship"/);
 const invitation = html.slice(html.indexOf('class="jyg-about-showcase__final-cta'));
 assert.match(invitation, /src="\/join-test.png"/);
});
