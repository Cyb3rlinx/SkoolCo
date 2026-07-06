import type { ReactNode } from "react";

/** Small labeled stat used in the hero and section headers. */
export function StatPill({ value, label, icon }: { value: ReactNode; label: string; icon?: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      {icon && (
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          {icon}
        </span>
      )}
      <div>
        <p className="text-lg font-extrabold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
