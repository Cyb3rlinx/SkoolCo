"use client";

import { useState, type FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { CalendarDays, MessageCircle, Pencil, Rocket, ThumbsUp, Trash2 } from "lucide-react";
import {
  ApiClientError,
  deleteAccount,
  fetchMe,
  fetchProducts,
} from "@/lib/frontend/api-client";
import { useApi, useMutation } from "@/lib/frontend/hooks";
import { formatDate } from "@/lib/frontend/format";
import type { MeProfile, ProductListItem } from "@/lib/frontend/types";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ProductCard } from "@/components/product/product-card";
import { ContactRequestsSection } from "@/components/profile/contact-requests-section";
import { SavedProductsSection } from "@/components/profile/saved-products-section";
import { SentContactRequestsSection } from "@/components/profile/sent-contact-requests-section";
import { CollaborationsSection } from "@/components/profile/collaborations-section";
import { CollaborationContactRequestsSection } from "@/components/profile/collaboration-contact-requests-section";
import { SentCollaborationContactRequestsSection } from "@/components/profile/sent-collaboration-contact-requests-section";
import { ProfileForm } from "@/components/forms/profile-form";
import { Field } from "@/components/forms/field";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

/** Own launches, all states, in one call (GET /api/products?maker=me). */
async function fetchMyLaunches(): Promise<ProductListItem[]> {
  const mine = await fetchProducts({ maker: "me", pageSize: 50 });
  return mine.items;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "outline"> = {
  LIVE: "success",
  SCHEDULED: "warning",
  DRAFT: "secondary",
  ARCHIVED: "outline",
};

const STATUS_KEY: Record<string, "published" | "scheduled" | "draft" | "archived"> = {
  LIVE: "published",
  SCHEDULED: "scheduled",
  DRAFT: "draft",
  ARCHIVED: "archived",
};

export function ProfileClient() {
  const t = useTranslations("profile");
  const tStatus = useTranslations("product.status");
  const tMaker = useTranslations("makerProfile");
  const locale = useLocale();
  const router = useRouter();
  const { data: session } = useSession();
  const [editing, setEditing] = useState(false);

  const me = useApi(fetchMe, {});
  const myId = session?.user?.id ?? "";
  const launches = useApi(fetchMyLaunches, {
    enabled: Boolean(myId),
    deps: [myId],
  });

  // --- Danger zone ----------------------------------------------------------
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState("");
  const del = useMutation(deleteAccount);

  async function onDelete(e: FormEvent) {
    e.preventDefault();
    const result = await del.mutate(password);
    if (result !== null) {
      await signOut({ redirect: false });
      router.push("/");
      router.refresh();
    }
  }

  if (me.loading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    );
  }

  if (me.error || !me.data) {
    return <ErrorState message={me.error ?? t("loadError")} onRetry={me.refetch} />;
  }

  const profile: MeProfile = me.data;

  return (
    <div className="space-y-10">
      {/* Header */}
      <Card>
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start">
          <Avatar name={profile.name} src={profile.avatarUrl} size="xl" />
          <div className="min-w-0 flex-1 space-y-2">
            {editing ? (
              <ProfileForm
                profile={profile}
                onSaved={(updated) => {
                  me.setData(updated);
                  setEditing(false);
                }}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold tracking-tight">{profile.name}</h1>
                  {profile.role !== "USER" && (
                    <Badge variant="gradient">
                      {profile.role === "ADMIN" ? t("roleAdmin") : t("roleMod")}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                {profile.bio && <p className="max-w-xl text-sm">{profile.bio}</p>}
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                  {tMaker("memberSince", { date: formatDate(profile.createdAt, locale) })}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="secondary">
                    <Rocket className="h-3 w-3" aria-hidden />{" "}
                    {tMaker("launchesCount", { count: profile._count.products })}
                  </Badge>
                  <Badge variant="secondary">
                    <ThumbsUp className="h-3 w-3" aria-hidden />{" "}
                    {tMaker("votesGiven", { count: profile._count.upvotes })}
                  </Badge>
                  <Badge variant="secondary">
                    <MessageCircle className="h-3 w-3" aria-hidden />{" "}
                    {tMaker("commentsCount", { count: profile._count.comments })}
                  </Badge>
                </div>
              </>
            )}
          </div>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              {t("editProfile")}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* My launches */}
      <section className="space-y-4" aria-labelledby="my-launches-title">
        <div className="flex items-center justify-between">
          <h2 id="my-launches-title" className="text-xl font-extrabold">
            {t("myLaunches")}
          </h2>
          <Link href="/submit" className={buttonVariants({ variant: "gradient", size: "sm" })}>
            <Rocket className="h-3.5 w-3.5" aria-hidden />
            {t("newLaunch")}
          </Link>
        </div>

        {launches.loading && (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        )}

        {!launches.loading && launches.error && (
          <ErrorState message={launches.error} onRetry={launches.refetch} />
        )}

        {!launches.loading && !launches.error && launches.data && launches.data.length === 0 && (
          <EmptyState
            title={t("emptyLaunchesTitle")}
            description={t("emptyLaunchesDescription")}
            action={
              <Link href="/submit" className={buttonVariants({ variant: "gradient" })}>
                {t("publishFirstProduct")}
              </Link>
            }
          />
        )}

        <div className="space-y-3">
          {launches.data?.map((p) => {
            const variant = STATUS_VARIANT[p.status] ?? STATUS_VARIANT.DRAFT;
            const statusKey = STATUS_KEY[p.status] ?? STATUS_KEY.DRAFT;
            return (
              <div key={p.id} className="relative">
                <ProductCard product={p} />
                <Badge variant={variant} className="absolute -top-2 left-4">
                  {tStatus(statusKey)}
                </Badge>
              </div>
            );
          })}
        </div>
      </section>

      {/* Productos guardados */}
      <SavedProductsSection />

      {/* Solicitudes de contacto (puente de compraventa) */}
      <ContactRequestsSection />
      <SentContactRequestsSection />
      <CollaborationsSection />
      <CollaborationContactRequestsSection />
      <SentCollaborationContactRequestsSection />

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">{t("dangerZoneTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">{t("dangerZoneDescription")}</p>
          <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            {t("deleteAccount")}
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t("deleteDialogTitle")}
        description={t("deleteDialogDescription")}
      >
        <form onSubmit={onDelete} className="space-y-4" noValidate>
          <Field id="del-password" label={t("passwordLabel")}>
            <Input
              id="del-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </Field>
          {del.error && <Alert variant="destructive">{del.error}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={del.submitting || !password}>
              {del.submitting ? t("deleting") : t("deletePermanently")}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
