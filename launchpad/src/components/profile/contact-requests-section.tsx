"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { Handshake } from "lucide-react";
import {
  ApiClientError,
  fetchMyContactRequests,
  resolveContactRequest,
} from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import { formatDate } from "@/lib/frontend/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";

const STATUS_VARIANT = {
  PENDING: "warning" as const,
  SHARED: "success" as const,
  DISMISSED: "outline" as const,
};

/** Solicitudes de contacto recibidas por los productos del usuario (puente de compraventa). */
export function ContactRequestsSection() {
  const t = useTranslations("contactRequests");
  const locale = useLocale();
  const requests = useApi(fetchMyContactRequests, {});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const STATUS_TEXT = {
    PENDING: t("statusPending"),
    SHARED: t("statusShared"),
    DISMISSED: t("statusDismissed"),
  };

  async function resolve(id: string, status: "SHARED" | "DISMISSED") {
    setError(null);
    setBusyId(id);
    try {
      await resolveContactRequest(id, status);
      requests.refetch();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errorUpdate"));
    } finally {
      setBusyId(null);
    }
  }

  // Sin solicitudes → no ocupar espacio en el perfil.
  if (!requests.loading && !requests.error && (requests.data?.length ?? 0) === 0) {
    return null;
  }

  return (
    <section className="space-y-4" aria-labelledby="contact-requests-title">
      <h2 id="contact-requests-title" className="flex items-center gap-2 text-xl font-extrabold">
        <Handshake className="h-5 w-5 text-primary" aria-hidden />
        {t("receivedTitle")}
      </h2>

      {requests.loading && <Skeleton className="h-24 w-full rounded-2xl" aria-busy="true" />}
      {!requests.loading && requests.error && (
        <ErrorState message={requests.error} onRetry={requests.refetch} />
      )}
      {error && <Alert variant="destructive">{error}</Alert>}

      <div className="space-y-3">
        {requests.data?.map((r) => {
          return (
            <Card key={r.id}>
              <CardContent className="space-y-2 p-5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-bold">{r.buyer.name}</span>
                  <span className="text-muted-foreground">{t("interestedIn")}</span>
                  <Link
                    href={`/products/${r.product.slug}`}
                    className="font-bold text-primary hover:underline"
                  >
                    {r.product.name}
                  </Link>
                  <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_TEXT[r.status]}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDate(r.createdAt, locale)}
                  </span>
                </div>
                <p className="rounded-xl bg-muted p-3 text-sm">{r.message}</p>
                {r.status === "PENDING" && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      disabled={busyId === r.id}
                      onClick={() => resolve(r.id, "SHARED")}
                    >
                      {t("shareEmail")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busyId === r.id}
                      onClick={() => resolve(r.id, "DISMISSED")}
                    >
                      {t("dismiss")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
