import { Loader2 } from "lucide-react";
import { cn } from "@/lib/frontend/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      role="status"
      aria-label="Cargando"
      className={cn("h-4 w-4 animate-spin", className)}
    />
  );
}
