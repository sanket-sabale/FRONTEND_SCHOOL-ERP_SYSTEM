import type { ReactNode } from "react";

export function FilterBar({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="grid gap-3 border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5 lg:grid-cols-[1fr_auto]">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
      {action ? <div className="responsive-action-row items-end">{action}</div> : null}
    </div>
  );
}
