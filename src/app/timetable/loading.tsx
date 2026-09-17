import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/shared/skeleton";

export default function TimetableLoading() {
  return <AppShell><div className="erp-container grid gap-4"><Skeleton className="h-36 w-full" /><Skeleton className="h-80 w-full" /></div></AppShell>;
}
