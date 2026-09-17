export function Breadcrumbs({ items }: { items: string[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
      {items.map((item, index) => (
        <span className="inline-flex items-center gap-1" key={item}>
          {index > 0 ? <span aria-hidden="true">/</span> : null}
          <span className={index === items.length - 1 ? "font-medium text-slate-700 dark:text-slate-300" : ""}>{item}</span>
        </span>
      ))}
    </nav>
  );
}
