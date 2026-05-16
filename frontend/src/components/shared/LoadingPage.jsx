import { Skeleton } from "@/components/ui/skeleton";

export function LoadingPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Loading...</p>
      <div className="flex gap-2 w-full max-w-xs">
        <Skeleton className="h-2 flex-1" />
        <Skeleton className="h-2 flex-1" />
        <Skeleton className="h-2 flex-1" />
      </div>
    </div>
  );
}
