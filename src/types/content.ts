export type Drama = { slug: string; title: string; category: string; synopsis: string; tags: string[]; cover: string; featured?: boolean; episodes: number; status: string };
export type Article = { slug: string; title: string; excerpt: string; category: string; cover: string; publishedAt: string; author: string; body: string[] };
export type CreatorStep = { step: string; title: string; description: string };
