"use client";

import Link from "next/link";
import { ArrowLeft, BadgeCheck, CalendarDays, MessageCircle, Rocket, ThumbsUp } from "lucide-react";
import { fetchProducts, fetchUser } from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import { formatDate } from "@/lib/frontend/format";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ProductCard } from "@/components/product/product-card";

/**
 * Public maker profile — GET /api/users/:id + GET /api/products?maker=:id.
 * Shows only community-facing info (no email) and LIVE launches.
 */
export function MakerProfileClient({ id }: { id: string }) {
  const user = useApi(() => fetchUser(id), { deps: [id] });
  const launches = useApi(() => fetchProducts({ maker: id, pageSize: 50 }), { deps: [id] });

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
            title="Maker no encontrado"
            description="Puede que el enlace esté roto o que la cuenta ya no exista."
            action={
              <Link href="/launches" className={buttonVariants({ variant: "outline" })}>
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Volver a lanzamientos
              </Link>
            }
          />
        ) : (
          <ErrorState message={user.error ?? "No pudimos cargar el perfil."} onRetry={user.refetch} />
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
        Lanzamientos
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start">
          <Avatar name={profile.name} src={profile.avatarUrl} size="xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
              {profile.name}
              {profile.verifiedAt && (
                <BadgeCheck className="h-5 w-5 shrink-0 text-primary" aria-label="Maker verificado" />
              )}
            </h1>
            {profile.bio && <p className="max-w-xl text-sm">{profile.bio}</p>}
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              En la comunidad desde {formatDate(profile.createdAt)}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="secondary">
                <Rocket className="h-3 w-3" aria-hidden /> {profile._count.products} lanzamientos
              </Badge>
              <Badge variant="secondary">
                <ThumbsUp className="h-3 w-3" aria-hidden /> {profile._count.upvotes} votos dados
              </Badge>
              <Badge variant="secondary">
                <MessageCircle className="h-3 w-3" aria-hidden /> {profile._count.comments} comentarios
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Launches */}
      <section className="space-y-4" aria-labelledby="maker-launches-title">
        <h2 id="maker-launches-title" className="text-xl font-extrabold">
          Lanzamientos de {profile.name}
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
          <EmptyState
            title="Todavía sin lanzamientos públicos"
            description="Cuando publique algo, lo verás aquí."
          />
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
