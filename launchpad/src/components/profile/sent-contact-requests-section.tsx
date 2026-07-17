"use client";

import Link from "next/link";
import { Send } from "lucide-react";
import { fetchSentContactRequests } from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import { formatDate } from "@/lib/frontend/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";

const STATUS_CHIP = {
  PENDING: { text: "Esperando respuesta", variant: "warning" as const },
  SHARED: { text: "Email compartido", variant: "success" as const },
  DISMISSED: { text: "Descartada", variant: "outline" as const },
};

/** Solicitudes de contacto que YO envié como comprador (puente de compraventa). */
export function SentContactRequestsSection() {
  const requests = useApi(fetchSentContactRequests, {});

  // Sin solicitudes enviadas → no ocupar espacio en el perfil.
  if (!requests.loading && !requests.error && (requests.data?.length ?? 0) === 0) {
    return null;
  }

  return (
    <section className="space-y-4" aria-labelledby="sent-contact-requests-title">
      <h2 id="sent-contact-requests-title" className="flex items-center gap-2 text-xl font-extrabold">
        <Send className="h-5 w-5 text-primary" aria-hidden />
        Mis solicitudes enviadas
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
                  <span className="text-muted-foreground">Solicitud a</span>
                  <Link
                    href={`/products/${r.product.slug}`}
                    className="font-bold text-primary hover:underline"
                  >
                    {r.product.name}
                  </Link>
                  <Badge variant={chip.variant}>{chip.text}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDate(r.createdAt)}
                  </span>
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
