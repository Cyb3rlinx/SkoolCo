"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CollaborationItem } from "@/lib/frontend/types";

export function CollaborationCard({ collaboration }: { collaboration: CollaborationItem }) {
  const t = useTranslations("collaborations");
  return (
    <Link href={`/colaboraciones/${collaboration.id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="space-y-2 p-5">
          <div className="flex items-center gap-2">
            <Badge variant={collaboration.type === "NEEDS" ? "warning" : "success"}>
              {collaboration.type === "NEEDS" ? t("typeNeeds") : t("typeOffers")}
            </Badge>
            <span className="text-xs text-muted-foreground">{collaboration.author.name}</span>
          </div>
          <h3 className="font-bold">{collaboration.title}</h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">{collaboration.description}</p>
          {collaboration.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {collaboration.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
