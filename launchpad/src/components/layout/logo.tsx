import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/frontend/utils";

/** Brand mark: Denveler icon + wordmark (cyan → blue gradient, matches brand assets). */
export function Logo({ withText = true, className }: { withText?: boolean; className?: string }) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2 focus-visible:outline-none", className)}
      aria-label="Denveler — inicio"
    >
      <Image
        src="/denveler-mark-64.png"
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 shrink-0"
        priority
      />
      {withText && (
        <span className="denveler-wordmark text-lg font-extrabold tracking-tight">
          denveler
        </span>
      )}
    </Link>
  );
}
