import type { ReactNode } from "react";
import { Card, Field, SectionHeader } from "@/components/ui";

export function StaffFormSection({
  children,
  description,
  eyebrow = "Staff",
  title,
}: {
  children: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <Card>
      <SectionHeader eyebrow={eyebrow} title={title} />
      <fieldset className="grid gap-4 p-4 sm:p-5">
        <legend className="sr-only">{title}</legend>
        <p className="text-sm leading-6 text-foreground-muted">{description}</p>
        <div className="grid gap-4 md:grid-cols-2">{children}</div>
      </fieldset>
    </Card>
  );
}

export function StaffTextInput({
  error,
  helperText,
  label,
  name,
  onChange,
  required,
  type = "text",
  value,
}: {
  error?: string;
  helperText?: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: "date" | "text";
  value: string;
}) {
  return (
    <Field error={error} helperText={helperText} label={label} required={required}>
      <input
        aria-invalid={Boolean(error) || undefined}
        className="h-9 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950"
        name={name}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </Field>
  );
}

export function StaffReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
      <span>{label}</span>
      <span className="flex min-h-9 items-center rounded-lg border border-border bg-surface-muted px-3 text-sm font-normal text-foreground-muted">
        {value}
      </span>
    </div>
  );
}
