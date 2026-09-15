import Image from "next/image";
import type { Article } from "@/content/types";

function headingId(text: string, index: number) {
  const normalized = text.toLocaleLowerCase("zh-Hant").replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-|-$/g, "");
  return normalized || `section-${index + 1}`;
}

export function ArticleBody({ article }: { article: Article }) {
  if (article.bodyBlocks?.length) {
    const headings = article.bodyBlocks.filter((block) => block.type === "heading").map((block, index) => ({ ...block, anchor: headingId(block.text, index) }));
    return (
      <div className="v2-article-layout">
        <aside className="v2-article-toc" aria-label="文章目錄"><a href="#article-content">文章內容</a>{headings.map((heading) => <a className={heading.level === 3 ? "is-sub" : ""} href={`#${heading.anchor}`} key={heading.id}>{heading.text}</a>)}<a href="#related-reading">相關閱讀</a></aside>
        <div className="v2-article-prose" id="article-content">
          <h2>文章內容</h2>
          {article.bodyBlocks.map((block, index) => {
            if (block.type === "heading") {
              const anchor = headingId(block.text, headings.findIndex((item) => item.id === block.id));
              return block.level === 2 ? <h2 id={anchor} key={block.id}>{block.text}</h2> : <h3 id={anchor} key={block.id}>{block.text}</h3>;
            }
            if (block.type === "quote") return <blockquote key={block.id}>{block.text}</blockquote>;
            if (block.type === "image") return <figure className="v2-article-inline-image" key={block.id}><Image src={block.media.src} alt={block.media.alt} width={block.media.width ?? 1400} height={block.media.height ?? 800} sizes="(max-width:900px) 100vw, 820px" unoptimized={block.media.src.startsWith("http")} />{block.caption ? <figcaption>{block.caption}</figcaption> : null}</figure>;
            return <p className={index === 0 ? "is-lead" : undefined} key={block.id}>{block.text}</p>;
          })}
        </div>
      </div>
    );
  }
  const parsed = article.body.map((entry, index) => {
    if (entry.startsWith("### ")) return { type: "h3" as const, text: entry.slice(4), id: headingId(entry.slice(4), index) };
    if (entry.startsWith("## ")) return { type: "h2" as const, text: entry.slice(3), id: headingId(entry.slice(3), index) };
    if (entry.startsWith("> ")) return { type: "quote" as const, text: entry.slice(2), id: undefined };
    return { type: "paragraph" as const, text: entry, id: undefined };
  });
  const headings = parsed.filter((entry): entry is typeof entry & { type: "h2" | "h3"; id: string } => Boolean(entry.id));

  return (
    <div className="v2-article-layout">
      <aside className="v2-article-toc" aria-label="文章目錄">
        <a href="#article-content">文章內容</a>
        {headings.map((heading) => <a className={heading.type === "h3" ? "is-sub" : ""} href={`#${heading.id}`} key={heading.id}>{heading.text}</a>)}
        <a href="#related-reading">相關閱讀</a>
      </aside>
      <div className="v2-article-prose" id="article-content">
        <h2>文章內容</h2>
        {parsed.map((entry, index) => {
          if (entry.type === "h2") return <h2 id={entry.id} key={index}>{entry.text}</h2>;
          if (entry.type === "h3") return <h3 id={entry.id} key={index}>{entry.text}</h3>;
          if (entry.type === "quote") return <blockquote key={index}>{entry.text}</blockquote>;
          return <p className={index === 0 ? "is-lead" : undefined} key={index}>{entry.text}</p>;
        })}
      </div>
    </div>
  );
}
