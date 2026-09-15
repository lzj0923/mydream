import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const sourceRoot = path.resolve("src");
const publicRoot = path.resolve("public");
const sourceExtensions = new Set([".css", ".js", ".jsx", ".ts", ".tsx"]);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return sourceExtensions.has(path.extname(entry.name)) ? [target] : [];
  });
}

test("源码中的本地 CMS 媒体引用都有可部署的 public 文件", () => {
  const references = new Map<string, string[]>();
  const expression = /["'`](\/cms-media\/[^"'`?#\s)]+)/g;

  for (const file of sourceFiles(sourceRoot)) {
    const content = readFileSync(file, "utf8");
    for (const match of content.matchAll(expression)) {
      const mediaPath = match[1];
      const owners = references.get(mediaPath) ?? [];
      owners.push(path.relative(process.cwd(), file));
      references.set(mediaPath, owners);
    }
  }

  assert.ok(references.size > 0, "没有扫描到 /cms-media/ 引用，测试配置可能失效");
  const missing = [...references.entries()].flatMap(([mediaPath, owners]) => {
    const target = path.join(publicRoot, mediaPath.slice("/cms-media/".length));
    try {
      return statSync(target).isFile() ? [] : [`${mediaPath}（${owners.join(", ")}）`];
    } catch {
      return [`${mediaPath}（${owners.join(", ")}）`];
    }
  });

  assert.deepEqual(missing, [], `以下媒体引用缺少 public 源文件：\n${missing.join("\n")}`);
});
