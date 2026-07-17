import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ProductListItem } from "@/lib/frontend/types";
import { cn } from "@/lib/frontend/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { Link } from "@/i18n/navigation";
import { ProductLogo } from "./product-logo";
import { UpvoteButton } from "./upvote-button";

interface ProductCardProps {
  product: ProductListItem;
  /** Position number for ranked lists (today's top, etc.). */
  rank?: number;
  className?: string;
}

/**
 * Launch card: thumbnail, name, tagline, category, maker, comment count and
 * upvote column. The whole surface links to the detail page; inner
 * interactive elements (upvote, category, maker) sit above the overlay.
 */
export function ProductCard({ product, rank, className }: ProductCardProps) {
  const t = useTranslations("common");
  return (
    <article
      className={cn(
        "group relative flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift",
        className
      )}
    >
      {/* Full-card link overlay (keeps the DOM accessible: one real link). */}
      <Link
        href={`/products/${product.slug}`}
        className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${product.name} — ${product.tagline}`}
      />

      {rank !== undefined && (
        <span className="hidden w-6 shrink-0 text-center text-sm font-extrabold text-muted-foreground/70 sm:block">
          {rank}
        </span>
      )}

      <ProductLogo name={product.name} src={product.logoUrl} />

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-bold leading-snug group-hover:text-primary">
          {product.name}
        </h3>
        <p className="truncate text-sm text-muted-foreground">{product.tagline}</p>

        <div className="relative z-10 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <Link
            href={`/launches?category=${product.category.slug}`}
            className="rounded-full bg-accent px-2 py-0.5 font-semibold text-accent-foreground transition-colors hover:bg-accent/70"
          >
            {product.category.name}
          </Link>
          <span className="flex items-center gap-1.5">
            <Avatar name={product.maker.name} src={product.maker.avatarUrl} size="xs" />
            {product.maker.name}
          </span>
          <span
            className="flex items-center gap-1"
            aria-label={t("commentsCount", { count: product._count.comments })}
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            {product._count.comments}
          </span>
        </div>
      </div>

      <div className="relative z-10">
        <UpvoteButton slug={product.slug} count={product._count.upvotes} />
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-soft">
      <Skeleton className="h-14 w-14 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-14 w-12 rounded-xl" />
    </div>
  );
}
