"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { fetchCollection } from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ProductCard, ProductCardSkeleton } from "@/components/product/product-card";

export function CollectionDetailClient({ slug }: { slug: string }) {
  const t = useTranslations("collections");
  const { data, loading, error, errorStatus, refetch } = useApi(() => fetchCollection(slug), {
    deps: [slug],
  });

  if (loading) {
    return (
      <div className="container-page space-y-6 py-10" aria-busy="true">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    if (errorStatus === 404) {
      return (
        <div className="container-page py-16">
          <EmptyState
            icon="search"
            title={t("notFoundTitle")}
            description={t("notFoundDescription")}
            action={
              <Link href="/colecciones" className={buttonVariants({ variant: "outline" })}>
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {t("backToCollections")}
              </Link>
            }
          />
        </div>
      );
    }
    return (
      <div className="container-page py-16">
        <ErrorState message={error ?? t("loadError")} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="container-page space-y-8 py-10">
      <Link
        href="/colecciones"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("metaTitle")}
      </Link>

      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{data.title}</h1>
        <p className="max-w-2xl text-muted-foreground">{data.description}</p>
      </div>

      {data.products.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="space-y-3">
          {data.products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
