export function V2SectionHeading({
  title,
  description,
  align = "left",
  cmsFields = false,
}: {
  index?: string;
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  cmsFields?: boolean;
}) {
  return (
    <header className={`v2-page-section-heading is-${align}`} data-motion="reveal">
      <h2 data-cms-field={cmsFields ? "title" : undefined}>{title}</h2>
      {description && <p className="v2-section-description" data-cms-field={cmsFields ? "description" : undefined}>{description}</p>}
    </header>
  );
}
