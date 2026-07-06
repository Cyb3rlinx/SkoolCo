import type { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/frontend/utils";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    // eslint-disable-next-line jsx-a11y/label-has-associated-control
    <label
      className={cn("text-sm font-semibold leading-none text-foreground", className)}
      {...props}
    />
  );
}
