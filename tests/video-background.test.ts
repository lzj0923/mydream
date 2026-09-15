import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import ts from "typescript";
import * as managedStyle from "../src/content/cms/managed-page-style.ts";

const require = createRequire(import.meta.url);
test("saved and preview backgrounds target the video main surface, not its covered parent", async () => {
  const compiled = ts.transpileModule(readFileSync("src/app/(frontend)/universe/videos/[slug]/page.tsx", "utf8"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports: { default?: (props: unknown) => Promise<Parameters<typeof renderToStaticMarkup>[0]> } = {};
  const fixture = { slug: "test", title: "Test video", description: "", type: "AI", views: "1", videoSrc: "/test.mp4" };
  runInNewContext(compiled, { exports, require: (name: string) => {
    if (name === "next/link") return { default: "a" };
    if (name === "next/image") return { default: "img" };
    if (name === "next/navigation") return { notFound: () => { throw new Error("missing fixture"); } };
    if (name.endsWith("video-duration")) return { VideoDuration: () => null };
    if (name.endsWith("jyg-video-prototype")) return { prototypeOriginalVideos: [], findPrototypeOriginalVideo: () => undefined };
    if (name.endsWith("managed-universe")) return { managedOriginalVideoList: () => [fixture], managedTutorialVideoList: () => [] };
    if (name.endsWith("java-cms-client")) return {
      getManagedContent: async () => [],
      getManagedPage: async () => ({ blocks: [{ zone: "page-background", props: { backgroundUrl: "/chosen.png", backgroundPosition: "25% center" }, style: {} }] }),
    };
    if (name.endsWith("managed-page-style")) return managedStyle;
    return require(name);
  }});
  const html = renderToStaticMarkup(await exports.default!({ params: Promise.resolve({ slug: "test" }) }));
  const main = html.match(/<main\b[^>]*>/)?.[0] ?? "";
  assert.match(main, /class="jyg-video-detail-main"/);
  assert.match(main, /data-cms-zone="page-background"/);
  assert.match(main, /background-image:url\(&quot;\/chosen.png&quot;\)/);
  assert.match(main, /background-position:25% center/);
  assert.equal((html.match(/data-cms-zone="page-background"/g) ?? []).length, 1);
});
