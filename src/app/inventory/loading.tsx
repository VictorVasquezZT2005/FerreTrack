
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

export default function InventoryPageLoading() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <Skeleton className="h-10 w-full sm:w-48" /> 
        <Skeleton className="h-10 w-full sm:w-48" />
      </div>

      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-1/3 mb-4" />
        <Skeleton className="h-10 w-full max-w-sm" />
      </div>
      
      <div className="rounded-md border">
        <div className="p-4">
          <div className="grid grid-cols-6 gap-4"> {/* Adjusted for more columns */}
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="grid grid-cols-6 gap-4 p-4 border-t">
             {[...Array(6)].map((_, j) => (
              <Skeleton key={j} className="h-5 w-full" />
            ))}
          </div>
        ))}
      </div>
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="ml-4 text-lg text-muted-foreground">Cargando inventario...</p>
      </div>
    </div>
  );
}
