"use client";

import { Button, Card, SectionHeader } from "@/components/ui";

export default function ProfileError({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-4 dark:bg-slate-950">
      <Card className="w-full max-w-md p-6">
        <SectionHeader eyebrow="Profile" title="Unable to load your profile" />
        <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Please try again. If the problem continues, contact your school administrator.
        </p>
        <div className="mt-5">
          <Button onClick={reset}>Retry</Button>
        </div>
      </Card>
    </main>
  );
}
