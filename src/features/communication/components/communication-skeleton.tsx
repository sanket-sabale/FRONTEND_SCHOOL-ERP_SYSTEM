import { Skeleton } from "@/components/shared/skeleton";

export function CommunicationSkeleton() {
  return (
    <section className="mx-auto flex min-h-[calc(100dvh-112px)] max-w-[1500px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <header className="shrink-0 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-8 w-72 max-w-full" />
        <Skeleton className="mt-3 h-4 w-[520px] max-w-full" />
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_minmax(300px,360px)_minmax(0,1fr)] xl:grid-cols-[232px_372px_minmax(0,1fr)]">
        <div className="flex gap-2 overflow-hidden border-b border-slate-200 p-3 dark:border-slate-800 lg:block lg:border-b-0 lg:border-r">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton className="h-11 min-w-36 lg:mb-2 lg:w-full" key={index} />
          ))}
        </div>
        <div className="border-b border-slate-200 p-3 dark:border-slate-800 lg:border-b-0 lg:border-r">
          <Skeleton className="h-10 w-full" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton className="h-20 w-full" key={index} />
            ))}
          </div>
        </div>
        <div className="min-h-[360px] bg-slate-50/70 p-5 dark:bg-slate-900/20 lg:min-h-0">
          <div className="grid h-full place-items-center">
            <div className="w-full max-w-lg">
              <Skeleton className="mx-auto h-14 w-14" />
              <Skeleton className="mx-auto mt-5 h-7 w-80 max-w-full" />
              <Skeleton className="mx-auto mt-3 h-4 w-96 max-w-full" />
              <Skeleton className="mx-auto mt-2 h-4 w-72 max-w-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
