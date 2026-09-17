import { Card, SectionHeader } from "@/components/ui";

export function SecurityState({ title, description }: { title: string; description: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-4 dark:bg-slate-950">
      <Card className="w-full max-w-md p-6">
        <SectionHeader title={title} eyebrow="Security" />
        <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
      </Card>
    </main>
  );
}
