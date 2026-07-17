"use client";

import { useTranslations } from "next-intl";
import { Handshake, Trash2 } from "lucide-react";
import { fetchMyCollaborations, deleteCollaboration } from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import { formatDate } from "@/lib/frontend/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { Link } from "@/i18n/navigation";

/** Anuncios de "Colaboraciones" publicados por el usuario, con borrado directo. */
export function CollaborationsSection() {
  const t = useTranslations("collaborations");
  const { data, loading, error, refetch } = useApi(fetchMyCollaborations, {});

  if (!loading && !error && (data?.length ?? 0) === 0) return null;

  async function onDelete(id: string) {
    await deleteCollaboration(id);
    refetch();
  }

  return (
    <section className="space-y-4" aria-labelledby="my-collaborations-title">
      <h2 id="my-collaborations-title" className="flex items-center gap-2 text-xl font-extrabold">
        <Handshake className="h-5 w-5 text-primary" aria-hidden />
        {t("myCollaborations")}
      </h2>

      {loading && <Skeleton className="h-24 w-full rounded-2xl" aria-busy="true" />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}

      <div className="space-y-3">
        {data?.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex items-center justify-between gap-3 p-5">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={c.type === "NEEDS" ? "warning" : "success"}>
                    {c.type === "NEEDS" ? t("typeNeeds") : t("typeOffers")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</span>
                </div>
                <Link href={`/colaboraciones/${c.id}`} className="font-bold hover:text-primary hover:underline">
                  {c.title}
                </Link>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(c.id)}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
