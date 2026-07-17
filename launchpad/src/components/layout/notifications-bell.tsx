"use client";

import { useCallback, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Bell, MessageCircle, TriangleAlert } from "lucide-react";
import { fetchNotifications, markNotificationsRead } from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import { useClickOutside } from "@/lib/frontend/use-click-outside";
import { timeAgo } from "@/lib/frontend/format";
import type { NotificationItem } from "@/lib/frontend/types";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Link } from "@/i18n/navigation";

/**
 * In-app notifications bell. Data: GET /api/notifications (badge uses
 * `unreadCount`); PATCH /api/notifications/read marks everything read.
 * Only rendered for signed-in users.
 */
export function NotificationsBell() {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useClickOutside(panelRef, useCallback(() => setOpen(false), []));

  const enabled = status === "authenticated";
  const { data, loading, error, refetch } = useApi(() => fetchNotifications(1, 10), {
    enabled,
    // No mock fallback here: notifications only make sense with a real session.
  });

  if (!enabled) return null;

  const unread = data?.unreadCount ?? 0;

  function notificationText(n: NotificationItem): string {
    if (n.type === "UPVOTE") return t("upvoted");
    if (n.type === "MENTION") return t("mentioned");
    if (n.type === "FOLLOWED_LAUNCH") return t("followedLaunch");
    return t("commentedOn");
  }

  async function markAllRead() {
    try {
      await markNotificationsRead();
      refetch();
    } catch {
      // Non-critical; leave list as-is.
    }
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread > 0 ? t("bellLabelUnread", { count: unread }) : t("bellLabel")}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border bg-card shadow-lift">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-bold">{t("title")}</p>
            {unread > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead}>
                {t("markRead")}
              </Button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
                <Spinner /> {t("loading")}
              </div>
            )}

            {!loading && error && (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                <TriangleAlert className="h-4 w-4 text-warning" aria-hidden />
                {t("loadError")}
              </div>
            )}

            {!loading && !error && data && data.items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
            )}

            {!loading &&
              data?.items.map((n) => (
                <Link
                  key={n.id}
                  href={n.product ? `/products/${n.product.slug}` : "/launches"}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/60"
                >
                  <Avatar name={n.actor.name} src={n.actor.avatarUrl} size="sm" />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold">{n.actor.name}</span>{" "}
                    <span className="text-muted-foreground">{notificationText(n)}</span>{" "}
                    {n.product && <span className="font-semibold">{n.product.name}</span>}
                    {n.comment && (
                      <span className="mt-0.5 line-clamp-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageCircle className="h-3 w-3 shrink-0" aria-hidden />
                        {n.comment.body}
                      </span>
                    )}
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {timeAgo(n.createdAt, locale)}
                    </span>
                  </span>
                  {!n.readAt && (
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                      aria-label={t("unread")}
                    />
                  )}
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
