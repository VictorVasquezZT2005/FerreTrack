import { Skeleton } from "@/components/ui/skeleton";
import { Hammer, Loader2 } from "lucide-react";

export default function PageLoading() {
  return (
    <div className="space-y-8">
      {/* Header Skeleton - though actual header is in layout */}
      {/* Action Buttons Skeleton */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <Skeleton className="h-10 w-full sm:w-40" />
        <Skeleton className="h-10 w-full sm:w-44" />
      </div>

      {/* Table Title Skeleton */}
      <Skeleton className="h-8 w-1/3 mb-4" />
      
      {/* Filter Input Skeleton */}
      <Skeleton className="h-10 w-full max-w-sm ml-auto mb-4" />

      {/* Table Skeleton */}
      <div className="rounded-md border">
        <div className="p-4"> {/* Mimic TableHeader structure */}
          <div className="flex justify-between">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-1/6" />
            ))}
          </div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex justify-between p-4 border-t">
            {[...Array(5)].map((_, j) => (
              <Skeleton key={j} className="h-5 w-1/6" />
            ))}
          </div>
        ))}
      </div>
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="ml-4 text-lg text-muted-foreground">Cargando el panel de FerreTrack...</p>
      </div>
    </div>
  );
}
