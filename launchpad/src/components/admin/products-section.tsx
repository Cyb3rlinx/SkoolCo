"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  ApiClientError,
  archiveProduct,
  fetchAdminProducts,
  toggleMrrVerified,
} from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import { formatDate } from "@/lib/frontend/format";
import type { ProductStatus } from "@/lib/frontend/types";
import { ProductLogo } from "@/components/product/product-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";

const STATUS_VARIANT: Record<ProductStatus, "success" | "warning" | "secondary" | "outline"> = {
  LIVE: "success",
  SCHEDULED: "warning",
  DRAFT: "secondary",
  ARCHIVED: "outline",
};

const STATUS_KEY: Record<ProductStatus, "published" | "scheduled" | "draft" | "archived"> = {
  LIVE: "published",
  SCHEDULED: "scheduled",
  DRAFT: "draft",
  ARCHIVED: "archived",
};

/** Pestaña Productos — lista completa + archivar (solo ADMIN). */
export function ProductsSection() {
  const t = useTranslations("admin.products");
  const tc = useTranslations("admin.common");
  const tStatus = useTranslations("product.status");
  const locale = useLocale();

  const FILTERS: { value: string; label: string }[] = [
    { value: "", label: t("filterAll") },
    { value: "LIVE", label: t("filterLive") },
    { value: "SCHEDULED", label: t("filterScheduled") },
    { value: "DRAFT", label: t("filterDraft") },
    { value: "ARCHIVED", label: t("filterArchived") },
  ];

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApi(
    () => fetchAdminProducts(q, status, page),
    { deps: [q, status, page] }
  );

  async function onArchive(slug: string, name: string, id: string) {
    if (!window.confirm(t("confirmArchive", { name }))) return;
    setActionError(null);
    setBusyId(id);
    try {
      await archiveProduct(slug);
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : t("errorArchive"));
    } finally {
      setBusyId(null);
    }
  }

  async function onToggleMrr(id: string) {
    setActionError(null);
    setBusyId(id);
    try {
      await toggleMrrVerified(id);
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : t("errorUpdate"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchLabel")}
          className="max-w-sm"
        />
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setStatus(f.value);
                setPage(1);
              }}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                status === f.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:border-primary/40"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {actionError && <Alert variant="destructive">{actionError}</Alert>}

      {loading && (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      )}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && data && data.items.length === 0 && (
        <EmptyState title={tc("noResultsTitle")} description={t("noResultsProducts")} />
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="space-y-2">
            {data.items.map((p) => {
              const busy = busyId === p.id;
              return (
                <Card key={p.id}>
                  <CardContent className="flex flex-wrap items-center gap-3 p-4">
                    <ProductLogo name={p.name} src={p.logoUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {p.maker.name} · {p.maker.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("launchInfo", {
                          date: formatDate(p.launchDate, locale),
                          votes: p._count.upvotes,
                          comments: p._count.comments,
                        })}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANT[p.status]}>{tStatus(STATUS_KEY[p.status])}</Badge>
                    {p.declaredMrrUsd !== null && (
                      <Badge variant={p.mrrVerifiedAt ? "success" : "outline"}>
                        {p.mrrVerifiedAt ? t("mrrVerified") : t("mrrUnverified")}
                      </Badge>
                    )}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/products/${p.slug}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                      >
                        {t("view")} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                      {p.declaredMrrUsd !== null && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => onToggleMrr(p.id)}
                        >
                          {p.mrrVerifiedAt ? t("removeMrrVerification") : t("verifyMrr")}
                        </Button>
                      )}
                      {p.status !== "ARCHIVED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => onArchive(p.slug, p.name, p.id)}
                        >
                          {t("archive")}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                {tc("prev")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {tc("pageOf", { page: data.page, totalPages: data.totalPages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage(page + 1)}
              >
                {tc("next")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
