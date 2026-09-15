export function V2SectionHeading({
  id,
  title,
  description,
  align = "left",
}: {
  index: string;
  id?: string;
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <header className={`v2-section-heading is-${align}`} data-motion="reveal">
      <h2 id={id}>{title}</h2>
      {description && <p className="v2-section-description">{description}</p>}
    </header>
  );
}
