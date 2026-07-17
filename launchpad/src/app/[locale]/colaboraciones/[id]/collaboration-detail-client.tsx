"use client";

import { useTranslations } from "next-intl";
import { fetchCollaboration } from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import { formatDate } from "@/lib/frontend/format";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { CollaborationContactCard } from "@/components/collaboration/collaboration-contact-card";
import { DeleteCollaborationButton } from "@/components/collaboration/delete-collaboration-button";
import { ReportButton } from "@/components/product/report-button";

export function CollaborationDetailClient({ id }: { id: string }) {
  const t = useTranslations("collaborations");
  const { data: collaboration, loading, error } = useApi(() => fetchCollaboration(id), { deps: [id] });

  if (loading) {
    return (
      <div className="container-page space-y-4 py-10">
        <Skeleton className="h-8 w-2/3" aria-busy="true" />
        <Skeleton className="h-40 w-full" aria-busy="true" />
      </div>
    );
  }

  if (error || !collaboration) {
    return (
      <div className="container-page py-10">
        <EmptyState title={t("notFoundTitle")} description={t("notFoundDescription")} />
      </div>
    );
  }

  return (
    <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={collaboration.type === "NEEDS" ? "warning" : "success"}>
            {collaboration.type === "NEEDS" ? t("typeNeeds") : t("typeOffers")}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {collaboration.author.name} · {formatDate(collaboration.createdAt)}
          </span>
        </div>
        <h1 className="text-2xl font-extrabold">{collaboration.title}</h1>
        <p className="whitespace-pre-wrap text-foreground/90">{collaboration.description}</p>
        {collaboration.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {collaboration.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 pt-2">
          <ReportButton collaborationId={collaboration.id} />
          <DeleteCollaborationButton collaborationId={collaboration.id} authorId={collaboration.author.id} />
        </div>
      </div>

      <div className="space-y-4">
        <CollaborationContactCard collaborationId={collaboration.id} authorId={collaboration.author.id} />
      </div>
    </div>
  );
}
