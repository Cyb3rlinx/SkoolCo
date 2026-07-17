"use client";

import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, CalendarDays, ExternalLink, Globe } from "lucide-react";
import { fetchProduct } from "@/lib/frontend/api-client";
import { mockProductDetails } from "@/lib/frontend/mock-data";
import { useApi } from "@/lib/frontend/hooks";
import { formatDate, isFuture, isToday } from "@/lib/frontend/format";
import type { ProductStatus } from "@/lib/frontend/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { DemoBanner, EmptyState, ErrorState } from "@/components/ui/states";
import { Link } from "@/i18n/navigation";
import { ProductLogo } from "@/components/product/product-logo";
import { UpvoteButton } from "@/components/product/upvote-button";
import { SaveButton } from "@/components/product/save-button";
import { ProductGallery } from "@/components/product/product-gallery";
import { CommentSection } from "@/components/product/comment-section";
import { ProductUpdatesSection } from "@/components/product/product-updates-section";
import { MakerCard } from "@/components/product/maker-card";
import { OfferCard } from "@/components/product/offer-card";
import { OfferSettings } from "@/components/product/offer-settings";
import { InsightsSection } from "@/components/product/insights-section";
import { RelaunchButton } from "@/components/product/relaunch-button";
import { ChangeLogoButton } from "@/components/product/change-logo-button";
import { EmbedBadgeCard } from "@/components/product/embed-badge-card";
import { RelatedLaunches } from "@/components/product/related-launches";
import { VoteWidgetCard } from "@/components/product/vote-widget-card";
import { ReportButton } from "@/components/product/report-button";
import { Card, CardContent } from "@/components/ui/card";

function StatusBadge({ status, launchDate }: { status: ProductStatus; launchDate: string }) {
  const t = useTranslations("product.status");
  if (status === "LIVE" && isToday(launchDate)) return <Badge variant="gradient">{t("launchedToday")}</Badge>;
  if (status === "LIVE") return <Badge variant="success">{t("published")}</Badge>;
  if (status === "SCHEDULED") return <Badge variant="warning">{t("scheduled")}</Badge>;
  if (status === "DRAFT") return <Badge variant="secondary">{t("draft")}</Badge>;
  return <Badge variant="outline">{t("archived")}</Badge>;
}

/** Product detail — GET /api/products/:slug (+ comments, related, upvote). */
export function ProductDetailClient({ slug }: { slug: string }) {
  const t = useTranslations("product.detail");
  const locale = useLocale();
  const { data: product, loading, error, errorStatus, demo, refetch } = useApi(
    () => fetchProduct(slug),
    {
      fallback: () => mockProductDetails.find((p) => p.slug === slug),
      deps: [slug],
    }
  );

  if (loading) {
    return (
      <div className="container-page space-y-8 py-10" aria-busy="true">
        <Skeleton className="h-5 w-40" />
        <div className="flex items-center gap-5">
          <Skeleton className="h-20 w-20 rounded-2xl" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-20 w-16 rounded-2xl" />
        </div>
        <Skeleton className="aspect-[16/8] w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !product) {
    if (errorStatus === 404) {
      return (
        <div className="container-page py-16">
          <EmptyState
            icon="search"
            title={t("notFoundTitle")}
            description={t("notFoundDescription")}
            action={
              <Link href="/launches" className={buttonVariants({ variant: "outline" })}>
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {t("backToLaunches")}
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
    <div className="container-page space-y-10 py-10">
      {/* Back + demo flag */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/launches"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("launches")}
        </Link>
        {demo && <DemoBanner />}
      </div>

      {/* Header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex flex-col items-start gap-2 sm:items-center">
          <ProductLogo name={product.name} src={product.logoUrl} size="lg" />
          <ChangeLogoButton slug={product.slug} makerId={product.maker.id} onUpdated={refetch} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{product.name}</h1>
            <StatusBadge status={product.status} launchDate={product.launchDate} />
          </div>
          <p className="mt-1 text-lg text-muted-foreground">{product.tagline}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={`/launches?category=${product.category.slug}`}
              className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent/70"
            >
              {product.category.name}
            </Link>
            {product.websiteUrl && (
              <a
                href={product.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Globe className="h-3.5 w-3.5" aria-hidden />
                {t("visitWebsite")}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-start gap-2 self-start sm:items-center sm:self-center">
          <UpvoteButton
            slug={product.slug}
            count={product._count.upvotes}
            upvoted={product.upvotedByMe}
            variant="large"
          />
          <SaveButton slug={product.slug} saved={product.savedByMe} />
        </div>
      </div>

      {/* Body */}
      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-10">
          <ProductGallery
            name={product.name}
            logoUrl={product.logoUrl}
            tagline={product.tagline}
            slug={product.slug}
            makerId={product.maker.id}
            images={product.images}
            onChanged={refetch}
          />

          <section aria-labelledby="about-title" className="space-y-3">
            <h2 id="about-title" className="text-xl font-extrabold">
              {t("about", { name: product.name })}
            </h2>
            <p className="whitespace-pre-line leading-relaxed text-foreground/90">
              {product.description}
            </p>
          </section>

          <ProductUpdatesSection slug={product.slug} makerId={product.maker.id} />

          <CommentSection slug={product.slug} live={product.status === "LIVE"} />
        </div>

        <aside className="space-y-6">
          <MakerCard maker={product.maker} />

          <RelaunchButton slug={product.slug} makerId={product.maker.id} status={product.status} />

          <OfferCard
            slug={product.slug}
            makerId={product.maker.id}
            openToOffers={product.openToOffers}
            declaredMrrUsd={product.declaredMrrUsd}
            monetizationNote={product.monetizationNote}
            mrrVerifiedAt={product.mrrVerifiedAt}
          />

          <OfferSettings
            slug={product.slug}
            makerId={product.maker.id}
            openToOffers={product.openToOffers}
            declaredMrrUsd={product.declaredMrrUsd}
            monetizationNote={product.monetizationNote}
            offerViewCount={product.offerViewCount}
            soldAt={product.soldAt}
            onUpdated={refetch}
          />

          <InsightsSection slug={product.slug} makerId={product.maker.id} />

          <Card>
            <CardContent className="space-y-3 p-5 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden />
                {isFuture(product.launchDate) ? t("launchesOn") : t("launchedOn")}{" "}
                {formatDate(product.launchDate, locale)}
              </p>
              <p className="text-muted-foreground">
                {t("votesAndComments", {
                  votes: product._count.upvotes,
                  comments: product._count.comments,
                })}
              </p>
              <div className="border-t pt-3">
                <ReportButton productId={product.id} />
              </div>
            </CardContent>
          </Card>

          <VoteWidgetCard slug={product.slug} makerId={product.maker.id} />

          <EmbedBadgeCard slug={product.slug} makerId={product.maker.id} />

          <RelatedLaunches categorySlug={product.category.slug} excludeSlug={product.slug} />
        </aside>
      </div>
    </div>
  );
}
