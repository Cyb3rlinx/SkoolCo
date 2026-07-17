"use client";

import { useLocale, useTranslations } from "next-intl";
import { Bookmark, ExternalLink, Trophy } from "lucide-react";
import { timeAgo } from "@/lib/frontend/format";
import { cn } from "@/lib/frontend/utils";
import type { CommunityLink } from "@/lib/frontend/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";

/**
 * Tarjeta de un logro verificado de la extensión (título + link externo al
 * post original). `onToggleSave` solo llega para usuarios autenticados; sin
 * él no se muestra el botón de guardar.
 */
export function AchievementCard({
  link,
  saved = false,
  busy = false,
  onToggleSave,
}: {
  link: CommunityLink;
  saved?: boolean;
  busy?: boolean;
  onToggleSave?: (link: CommunityLink) => void;
}) {
  const t = useTranslations("achievements");
  const locale = useLocale();

  const TYPE_LABEL: Record<string, string> = {
    logro: t("typeLogro"),
    milestone: t("typeMilestone"),
    announcement: t("typeAnnouncement"),
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
            <Trophy className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-semibold">{link.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Avatar name={link.submittedBy.name} src={link.submittedBy.avatarUrl} size="xs" />
              {link.submittedBy.name}
              <Badge variant="secondary">{TYPE_LABEL[link.type] ?? t("typeOther")}</Badge>
              <span>{timeAgo(link.createdAt, locale)}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onToggleSave && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onToggleSave(link)}
              aria-label={saved ? t("unsaveLabel") : t("saveLabel")}
              aria-pressed={saved}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:opacity-60",
                saved
                  ? "border-primary bg-accent text-primary"
                  : "text-muted-foreground hover:border-primary/40 hover:text-primary"
              )}
            >
              <Bookmark className={cn("h-4 w-4", saved && "fill-current")} aria-hidden />
            </button>
          )}
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            {t("viewPost")}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
