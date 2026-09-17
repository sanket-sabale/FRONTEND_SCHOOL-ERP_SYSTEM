import { Button, Card, Field, SectionHeader } from "@/components/ui";

export function LoginCard() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-4 dark:bg-slate-950">
      <Card className="w-full max-w-md p-6">
        <SectionHeader title="Sign in to SchoolERP OS" eyebrow="Secure access" />
        <form className="mt-5 grid gap-4">
          <Field label="Work email">
            <input className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100 dark:border-slate-800 dark:bg-slate-950 dark:focus:ring-sky-950" type="email" />
          </Field>
          <Field label="Password">
            <input className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100 dark:border-slate-800 dark:bg-slate-950 dark:focus:ring-sky-950" type="password" />
          </Field>
          <Button>Sign In</Button>
          <p className="text-xs leading-5 text-slate-500">
            Authentication secrets are not stored in this frontend foundation. The backend identity provider remains authoritative.
          </p>
        </form>
      </Card>
    </main>
  );
}
