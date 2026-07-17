"use client";

import { useTranslations } from "next-intl";
import { fetchProducts } from "@/lib/frontend/api-client";
import { filterMockProducts } from "@/lib/frontend/mock-data";
import { useApi } from "@/lib/frontend/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { ProductLogo } from "./product-logo";

/**
 * "Lanzamientos relacionados": other LIVE products in the same category.
 * Data: GET /api/products?category=:slug (current product excluded locally).
 */
export function RelatedLaunches({
  categorySlug,
  excludeSlug,
}: {
  categorySlug: string;
  excludeSlug: string;
}) {
  const t = useTranslations("product.related");
  const { data, loading } = useApi(
    () => fetchProducts({ category: categorySlug, sort: "top", pageSize: 5 }),
    {
      fallback: () => filterMockProducts({ category: categorySlug, sort: "top", pageSize: 5 }),
      deps: [categorySlug],
    }
  );

  const items = (data?.items ?? []).filter((p) => p.slug !== excludeSlug).slice(0, 4);

  if (!loading && items.length === 0) return null;

  return (
    <section aria-labelledby="related-title" className="space-y-3">
      <h2 id="related-title" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {t("title")}
      </h2>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((p) => (
            <li key={p.id}>
              <Link
                href={`/products/${p.slug}`}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-soft transition-all hover:border-primary/30 hover:shadow-lift"
              >
                <ProductLogo name={p.name} src={p.logoUrl} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{p.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {p.tagline}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-bold text-muted-foreground">
                  ▲ {p._count.upvotes}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
