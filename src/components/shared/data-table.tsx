import type { ReactNode } from "react";
import { Button, EmptyState } from "@/components/ui";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
};

export function DataTable<T>({
  data,
  columns,
  getRowId,
  emptyTitle,
  emptyDescription,
  totalLabel,
}: {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  emptyTitle: string;
  emptyDescription: string;
  totalLabel: string;
}) {
  if (data.length === 0) {
    return (
      <div className="p-5">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 p-3 sm:hidden">
        {data.map((row) => (
          <article className="rounded-lg border border-border bg-surface-muted p-3" key={getRowId(row)}>
            <dl className="grid gap-3">
              {columns.map((column) => (
                <div className="min-w-0" key={column.key}>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">{column.header}</dt>
                  <dd className="responsive-text mt-1 text-sm text-foreground">{column.cell(row)}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
      <div className="responsive-table-wrap hidden sm:block">
        <table className="responsive-table text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
            <tr>
              {columns.map((column) => (
                <th className={`px-4 py-3 font-semibold sm:px-5 ${column.className ?? ""}`} key={column.key}>
                  <button className="inline-flex items-center gap-1 rounded text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" type="button">
                    {column.header}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row) => (
              <tr className="hover:bg-surface-muted" key={getRowId(row)}>
                {columns.map((column) => (
                  <td className={`px-4 py-4 sm:px-5 ${column.className ?? ""}`} key={column.key}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-foreground-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <span className="responsive-text">{totalLabel}</span>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="secondary">Previous</Button>
          <Button variant="secondary">Next</Button>
        </div>
      </div>
    </>
  );
}
