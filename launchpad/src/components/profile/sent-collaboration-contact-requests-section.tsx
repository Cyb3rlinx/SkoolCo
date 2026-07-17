"use client";

import { useTranslations, useLocale } from "next-intl";
import { Send } from "lucide-react";
import { fetchSentCollaborationContactRequests } from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import { formatDate } from "@/lib/frontend/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { Link } from "@/i18n/navigation";

/** Solicitudes de contacto que YO envié sobre colaboraciones ajenas. */
export function SentCollaborationContactRequestsSection() {
  const t = useTranslations("collaborations");
  const tContact = useTranslations("contactRequests");
  const locale = useLocale();
  const requests = useApi(fetchSentCollaborationContactRequests, {});

  const STATUS_CHIP = {
    PENDING: { text: t("waitingResponse"), variant: "warning" as const },
    SHARED: { text: t("emailShared"), variant: "success" as const },
    DISMISSED: { text: t("dismissed"), variant: "outline" as const },
  };

  if (!requests.loading && !requests.error && (requests.data?.length ?? 0) === 0) return null;

  return (
    <section className="space-y-4" aria-labelledby="sent-collab-contact-requests-title">
      <h2 id="sent-collab-contact-requests-title" className="flex items-center gap-2 text-xl font-extrabold">
        <Send className="h-5 w-5 text-primary" aria-hidden />
        {t("contactRequestsSent")}
      </h2>

      {requests.loading && <Skeleton className="h-24 w-full rounded-2xl" aria-busy="true" />}
      {!requests.loading && requests.error && (
        <ErrorState message={requests.error} onRetry={requests.refetch} />
      )}

      <div className="space-y-3">
        {requests.data?.map((r) => {
          const chip = STATUS_CHIP[r.status];
          return (
            <Card key={r.id}>
              <CardContent className="space-y-2 p-5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{tContact("requestTo")}</span>
                  <Link
                    href={`/colaboraciones/${r.collaboration.id}`}
                    className="font-bold text-primary hover:underline"
                  >
                    {r.collaboration.title}
                  </Link>
                  <Badge variant={chip.variant}>{chip.text}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">{formatDate(r.createdAt, locale)}</span>
                </div>
                <p className="rounded-xl bg-muted p-3 text-sm">{r.message}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
