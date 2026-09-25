import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="w-full space-y-6 animate-in fade-in-50 duration-200">
      {/* Secondary Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-36 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex items-center gap-6 border-b border-neutral-200 pb-3">
        <Skeleton className="h-5 w-24 rounded-md" />
        <Skeleton className="h-5 w-28 rounded-md" />
        <Skeleton className="h-5 w-24 rounded-md" />
      </div>

      {/* Search Input Skeleton */}
      <div className="max-w-md">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>

      {/* Event Cards Grid Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-6 w-48 rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
            <Skeleton className="h-8 w-32 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-6 w-48 rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
            <Skeleton className="h-8 w-32 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
