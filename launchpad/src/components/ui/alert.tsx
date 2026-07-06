import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/frontend/utils";

const alertVariants = cva("flex items-start gap-3 rounded-xl border p-4 text-sm", {
  variants: {
    variant: {
      info: "border-primary/20 bg-accent text-accent-foreground",
      destructive: "border-destructive/25 bg-destructive/5 text-destructive",
      success: "border-success/25 bg-success/5 text-success",
    },
  },
  defaultVariants: { variant: "info" },
});

const ICONS = { info: Info, destructive: AlertCircle, success: CheckCircle2 } as const;

export interface AlertProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

export function Alert({ className, variant = "info", children, ...props }: AlertProps) {
  const Icon = ICONS[variant ?? "info"];
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
