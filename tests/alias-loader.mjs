import { existsSync } from "node:fs";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const root = new URL("../src/", import.meta.url);
    const candidate = new URL(`${specifier.slice(2)}.ts`, root);
    const indexCandidate = new URL(`${specifier.slice(2)}/index.ts`, root);
    return nextResolve(existsSync(candidate) ? candidate.href : indexCandidate.href, context);
  }
  if (specifier.startsWith(".") && !specifier.endsWith(".ts") && !specifier.endsWith(".tsx") && !specifier.endsWith(".js") && !specifier.endsWith(".mjs")) {
    const candidate = new URL(`${specifier}.ts`, context.parentURL);
    if (existsSync(candidate)) return nextResolve(candidate.href, context);
    const indexCandidate = new URL(`${specifier}/index.ts`, context.parentURL);
    if (existsSync(indexCandidate)) return nextResolve(indexCandidate.href, context);
  }
  return nextResolve(specifier, context);
}
