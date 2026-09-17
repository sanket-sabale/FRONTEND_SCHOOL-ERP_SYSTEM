import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";
type CardVariant = "default" | "elevated" | "muted" | "interactive";

const toneClasses: Record<Tone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  danger: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300",
  info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  neutral: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={cn("inline-flex max-w-full items-center rounded-md border px-2 py-1 text-xs font-medium leading-4", toneClasses[tone])}>
      <span className="responsive-text">{children}</span>
    </span>
  );
}

export function LinkButton({ children, className = "", ...props }: ComponentPropsWithoutRef<"a">) {
  return (
    <a
      className={cn(
        "inline-flex min-h-9 min-w-0 items-center justify-center rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium leading-5 text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}

export function Card({
  children,
  className = "",
  variant = "default",
  ...props
}: ComponentPropsWithoutRef<"section"> & { variant?: CardVariant }) {
  return (
    <section
      className={cn(
        "rounded-xl border shadow-sm",
        variant === "default" && "border-border bg-surface",
        variant === "elevated" && "border-border bg-surface-elevated shadow-[var(--shadow-level-2)]",
        variant === "muted" && "border-border bg-surface-muted",
        variant === "interactive" &&
          "border-border bg-surface transition-colors hover:border-border-strong hover:bg-surface-muted motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function PageHeader({
  action,
  breadcrumbs,
  children,
  className,
  description,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  breadcrumbs?: ReactNode;
  children?: ReactNode;
  className?: string;
  description?: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <section
      className={cn(
        "responsive-panel border border-border bg-surface p-4 shadow-sm sm:p-5",
        "grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,auto)] lg:items-start",
        className,
      )}
    >
      <div className="min-w-0">
        {breadcrumbs}
        {eyebrow ? <p className="mt-4 text-sm font-semibold text-primary dark:text-sky-300">{eyebrow}</p> : null}
        <h1 className="responsive-text mt-2 max-w-3xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action ?? children ? (
        <div className="min-w-0 space-y-3 lg:justify-self-end">
          {action ? <div className="responsive-action-row lg:justify-end">{action}</div> : null}
          {children}
        </div>
      ) : null}
    </section>
  );
}

export function SectionHeader({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-wide text-primary">{eyebrow}</p> : null}
        <h2 className="responsive-text text-lg font-semibold text-foreground">{title}</h2>
      </div>
      {action ? <div className="responsive-action-row">{action}</div> : null}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-surface-muted p-5 text-center sm:p-6">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-foreground-muted">{description}</p>
    </div>
  );
}

export function Field({
  children,
  error,
  helperText,
  label,
  required,
}: {
  children: ReactNode;
  error?: string;
  helperText?: string;
  label: string;
  required?: boolean;
}) {
  const helperId = helperText ? `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-helper` : undefined;
  const errorId = error ? `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-error` : undefined;
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
      <span>
        {label}
        {required ? <span aria-hidden="true" className="ml-1 text-danger">*</span> : null}
      </span>
      {children}
      {helperText && !error ? <span className="text-xs font-normal text-foreground-muted" id={helperId}>{helperText}</span> : null}
      {error ? <span className="text-xs font-normal text-danger" id={errorId} role="alert">{error}</span> : null}
    </label>
  );
}

export function Select({ className = "", ...props }: ComponentPropsWithoutRef<"select">) {
  return (
    <select
      className={cn(
        "h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
