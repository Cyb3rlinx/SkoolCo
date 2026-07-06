import type { ReactNode } from "react";
import { FlaskConical, Inbox, RefreshCw, SearchX } from "lucide-react";
import { cn } from "@/lib/frontend/utils";
import { Button } from "./button";

/** Empty state: icon + title + hint + optional CTA. */
export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  className,
}: {
  icon?: "inbox" | "search";
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  const Icon = icon === "search" ? SearchX : Inbox;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/40 px-6 py-14 text-center",
        className
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <p className="text-base font-bold">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Error state with retry. */
export function ErrorState({
  message = "No pudimos cargar esta sección.",
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 px-6 py-12 text-center",
        className
      )}
    >
      <p className="text-base font-bold text-destructive">Algo salió mal</p>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Reintentar
        </Button>
      )}
    </div>
  );
}

/**
 * Shown when a view renders mock data because the API/DB is unreachable.
 * Keeps the demo honest: real integration vs. sample data is always visible.
 */
export function DemoBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning",
        className
      )}
    >
      <FlaskConical className="h-3.5 w-3.5" aria-hidden />
      Datos de demo — la API no está disponible (¿levantaste la base de datos?)
    </div>
  );
}
