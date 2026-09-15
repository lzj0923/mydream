import type { ContentRepository } from "@/content/repositories";
import { LocalContentProvider } from "./local-content-provider";

let localRepository: ContentRepository | undefined;

/**
 * Frontend-only content composition root.
 * A future Java API adapter can implement ContentRepository without changing pages.
 */
export async function getContentProvider(): Promise<ContentRepository> {
  localRepository ??= new LocalContentProvider();
  return localRepository;
}

export { LocalContentProvider } from "./local-content-provider";
