import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { creatorOptionLabel, formats, genres } from "../src/components/creator-workspace/types.ts";
import { catalogGenres } from "../src/lib/catalog-genres.ts";

test("ranking splits combined catalog genres into distinct selectable tags", () => {
  const values = ["漫劇、都市", "漫劇、都市、愛情", "古風、奇幻"];
  const tags = values.map(catalogGenres);
  assert.deepEqual([...new Set(tags.flat())], ["漫劇", "都市", "愛情", "古風", "奇幻"]);
  assert.equal(tags.filter(row => row.includes("都市")).length, 2);
  assert.equal(tags.filter(row => row.includes("奇幻")).length, 1);
  assert.equal(tags.filter(row => row.includes("都")).length, 0);
});

test("catalog genre parsing removes blanks and duplicates without splitting multiword tags", () => {
  assert.deepEqual(catalogGenres(" 都市、都市，愛情,古風；奇幻|逆襲/重生\n "), ["都市", "愛情", "古風", "奇幻", "逆襲", "重生"]);
  assert.deepEqual(catalogGenres(" ,、； "), []);
  assert.deepEqual(catalogGenres("Women Growth, Time Travel"), ["Women Growth", "Time Travel"]);
});

// Check actual UI literals, including hidden panels, placeholders and error states.
// Stored option values and upstream memo matches are protocol data, not UI labels.
const simplified = /[创剧视频帮审过载读账数页签约录线验请传选关联项进补将与认当暂时获赞评论润奖积现总统计条导筛围类隐态败称写说凭实确个从后还并为无处仅这会来发经试户]/;
const legacyOptions = new Set([...genres, ...formats, "悬疑", "真人短剧", "AI 短剧", "动画短剧"]);
const files = readdirSync("src/components/creator-workspace")
  .filter(file => /\.tsx?$/.test(file))
  .map(file => path.join("src/components/creator-workspace", file));
files.push("src/lib/creator-analytics.ts", "src/app/api/creator-analytics/route.ts", "src/app/api/creator/[...path]/route.ts");

test("creator workspace UI literals use Traditional Chinese across every panel", () => {
  const failures: string[] = [];
  for (const file of files) {
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    function visit(node: ts.Node) {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isJsxText(node)) {
        const value = node.text;
        const protocolOption = ts.isStringLiteral(node) && legacyOptions.has(value) &&
          (file.endsWith("types.ts") || (value === "悬疑" && ts.isArrayLiteralExpression(node.parent)));
        const protocolMemo = file === "src/lib/creator-analytics.ts" && ts.isArrayLiteralExpression(node.parent) && value === "创作者分润奖励";
        if (!protocolOption && !protocolMemo && simplified.test(value)) {
          const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
          failures.push(`${file}:${line}: ${value.trim().slice(0, 80)}`);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.deepEqual(failures, []);
});

test("legacy creator options display Traditional Chinese without changing saved values", () => {
  assert.deepEqual(formats, ["漫剧", "短剧"]);
  assert.equal(creatorOptionLabel("AI 短剧"), "漫劇");
  assert.equal(creatorOptionLabel("真人短剧"), "短劇");
  assert.equal(creatorOptionLabel(genres[3]), "奇幻冒險");
  assert.equal(creatorOptionLabel("悬疑"), "懸疑");
  assert.equal(creatorOptionLabel("作者自定义题材"), "作者自定义题材");
});
