import { Skeleton } from "@/components/shared/skeleton";

export default function ProfileLoading() {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Skeleton className="h-32 w-full" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
