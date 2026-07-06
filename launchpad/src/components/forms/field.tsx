import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/frontend/utils";

/**
 * Form field wrapper: label + control + hint/error line.
 * Pass the control's id so label/aria wiring stays correct.
 */
export function Field({
  id,
  label,
  hint,
  error,
  children,
  optional = false,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  optional?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id}>{label}</Label>
        {optional && <span className="text-xs text-muted-foreground">Opcional</span>}
      </div>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
