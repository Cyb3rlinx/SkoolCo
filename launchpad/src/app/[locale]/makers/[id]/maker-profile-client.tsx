"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  MessageCircle,
  Rocket,
  ThumbsUp,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { ApiClientError, fetchProducts, fetchUser, followUser, unfollowUser } from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import { formatDate } from "@/lib/frontend/format";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ProductCard } from "@/components/product/product-card";
import { Link } from "@/i18n/navigation";

/**
 * Public maker profile — GET /api/users/:id + GET /api/products?maker=:id.
 * Shows only community-facing info (no email) and LIVE launches.
 */
export function MakerProfileClient({ id }: { id: string }) {
  const t = useTranslations("makerProfile");
  const locale = useLocale();
  const { data: session } = useSession();
  const user = useApi(() => fetchUser(id), { deps: [id] });
  const launches = useApi(() => fetchProducts({ maker: id, pageSize: 50 }), { deps: [id] });
  const [followBusy, setFollowBusy] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);

  async function onToggleFollow(currentlyFollowing: boolean) {
    setFollowError(null);
    setFollowBusy(true);
    try {
      if (currentlyFollowing) await unfollowUser(id);
      else await followUser(id);
      user.refetch();
    } catch (err) {
      setFollowError(err instanceof ApiClientError ? err.message : t("followUpdateError"));
    } finally {
      setFollowBusy(false);
    }
  }

  if (user.loading) {
    return (
      <div className="container-page space-y-6 py-10" aria-busy="true">
        <Skeleton className="h-5 w-40" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (user.error || !user.data) {
    return (
      <div className="container-page py-16">
        {user.errorStatus === 404 ? (
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
        ) : (
          <ErrorState message={user.error ?? t("loadError")} onRetry={user.refetch} />
        )}
      </div>
    );
  }

  const profile = user.data;

  return (
    <div className="container-page space-y-10 py-10">
      <Link
        href="/launches"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("launches")}
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start">
          <Avatar name={profile.name} src={profile.avatarUrl} size="xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
                {profile.name}
                {profile.verifiedAt && (
                  <BadgeCheck className="h-5 w-5 shrink-0 text-primary" aria-label={t("verifiedMaker")} />
                )}
              </h1>
              {session?.user?.id && session.user.id !== id && (
                <Button
                  variant={profile.isFollowedByMe ? "outline" : "default"}
                  size="sm"
                  disabled={followBusy}
                  onClick={() => onToggleFollow(profile.isFollowedByMe)}
                >
                  {profile.isFollowedByMe ? (
                    <>
                      <UserCheck className="h-3.5 w-3.5" aria-hidden /> {t("following")}
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3.5 w-3.5" aria-hidden /> {t("follow")}
                    </>
                  )}
                </Button>
              )}
            </div>
            {followError && <Alert variant="destructive">{followError}</Alert>}
            {profile.bio && <p className="max-w-xl text-sm">{profile.bio}</p>}
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              {t("memberSince", { date: formatDate(profile.createdAt, locale) })}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="secondary">
                <Rocket className="h-3 w-3" aria-hidden /> {t("launchesCount", { count: profile._count.products })}
              </Badge>
              <Badge variant="secondary">
                <ThumbsUp className="h-3 w-3" aria-hidden /> {t("votesGiven", { count: profile._count.upvotes })}
              </Badge>
              <Badge variant="secondary">
                <MessageCircle className="h-3 w-3" aria-hidden /> {t("commentsCount", { count: profile._count.comments })}
              </Badge>
              <Badge variant="secondary">
                <UserCheck className="h-3 w-3" aria-hidden /> {t("followersCount", { count: profile._count.followers })}
              </Badge>
            </div>
            {profile.badges.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {profile.badges.map((b) => (
                  <span
                    key={b.slug}
                    title={b.description}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary"
                  >
                    <span aria-hidden>{b.icon}</span>
                    {b.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Launches */}
      <section className="space-y-4" aria-labelledby="maker-launches-title">
        <h2 id="maker-launches-title" className="text-xl font-extrabold">
          {t("launchesBy", { name: profile.name })}
        </h2>

        {launches.loading && (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        )}

        {!launches.loading && launches.error && (
          <ErrorState message={launches.error} onRetry={launches.refetch} />
        )}

        {!launches.loading && !launches.error && launches.data?.items.length === 0 && (
          <EmptyState title={t("noPublicLaunchesTitle")} description={t("noPublicLaunchesDescription")} />
        )}

        <div className="space-y-3">
          {launches.data?.items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
