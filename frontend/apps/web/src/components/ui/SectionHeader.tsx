export function SectionHeader({ script, title, description }: { script?: string; title: string; description?: string }) {
  return (
    <div className="text-center mb-10">
      {script && <p className="font-[family-name:var(--font-script)] text-2xl md:text-3xl text-golden mb-2">{script}</p>}
      <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-bold text-foreground">{title}</h2>
      {description && <p className="text-muted-foreground text-lg mt-3 max-w-2xl mx-auto">{description}</p>}
    </div>
  );
}

export default SectionHeader;
