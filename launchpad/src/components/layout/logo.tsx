import Link from "next/link";
import { Rocket } from "lucide-react";
import { cn } from "@/lib/frontend/utils";

/** Brand mark: gradient rocket tile + wordmark. */
export function Logo({ withText = true, className }: { withText?: boolean; className?: string }) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2 focus-visible:outline-none", className)}
      aria-label="LaunchPad — inicio"
    >
      <span className="brand-gradient flex h-8 w-8 items-center justify-center rounded-lg shadow-soft">
        <Rocket className="h-[18px] w-[18px] text-white" aria-hidden />
      </span>
      {withText && <span className="text-lg font-extrabold tracking-tight">LaunchPad</span>}
    </Link>
  );
}
