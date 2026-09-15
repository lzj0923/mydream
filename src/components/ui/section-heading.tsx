export function SectionHeading({ title, text }: { eyebrow: string; title: string; text?: string }) { return <header className="section-head"><h2>{title}</h2>{text && <p>{text}</p>}</header>; }
