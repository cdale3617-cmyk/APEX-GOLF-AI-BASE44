export default function PageHeader({ title, subtitle, children = null }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-heading text-lg font-bold tracking-tight text-foreground">{title}</h2>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{subtitle}</p>
      </div>
      {children ? <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">{children}</div> : null}
    </div>
  );
}