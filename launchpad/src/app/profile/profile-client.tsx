"use client";

import { useState, type FormEvent } from "react";
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
import { SentContactRequestsSection } from "@/components/profile/sent-contact-requests-section";
import { ProfileForm } from "@/components/forms/profile-form";
import { Field } from "@/components/forms/field";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

/** Own launches, all states, in one call (GET /api/products?maker=me). */
async function fetchMyLaunches(): Promise<ProductListItem[]> {
  const mine = await fetchProducts({ maker: "me", pageSize: 50 });
  return mine.items;
}

const STATUS_LABEL: Record<string, { text: string; variant: "success" | "warning" | "secondary" | "outline" }> = {
  LIVE: { text: "Publicado", variant: "success" },
  SCHEDULED: { text: "Programado", variant: "warning" },
  DRAFT: { text: "Borrador", variant: "secondary" },
  ARCHIVED: { text: "Archivado", variant: "outline" },
};

export function ProfileClient() {
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
    return <ErrorState message={me.error ?? "No pudimos cargar tu perfil."} onRetry={me.refetch} />;
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
                    <Badge variant="gradient">{profile.role === "ADMIN" ? "Admin" : "Mod"}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
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
              </>
            )}
          </div>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Editar perfil
            </Button>
          )}
        </CardContent>
      </Card>

      {/* My launches */}
      <section className="space-y-4" aria-labelledby="my-launches-title">
        <div className="flex items-center justify-between">
          <h2 id="my-launches-title" className="text-xl font-extrabold">
            Mis lanzamientos
          </h2>
          <Link href="/submit" className={buttonVariants({ variant: "gradient", size: "sm" })}>
            <Rocket className="h-3.5 w-3.5" aria-hidden />
            Nuevo lanzamiento
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
            title="Todavía no lanzaste nada"
            description="Tu primer lanzamiento está a un formulario de distancia. La comunidad quiere verlo."
            action={
              <Link href="/submit" className={buttonVariants({ variant: "gradient" })}>
                Publicar mi primer producto
              </Link>
            }
          />
        )}

        <div className="space-y-3">
          {launches.data?.map((p) => {
            const s = STATUS_LABEL[p.status] ?? STATUS_LABEL.DRAFT;
            return (
              <div key={p.id} className="relative">
                <ProductCard product={p} />
                <Badge variant={s.variant} className="absolute -top-2 left-4">
                  {s.text}
                </Badge>
              </div>
            );
          })}
        </div>
      </section>

      {/* Solicitudes de contacto (puente de compraventa) */}
      <ContactRequestsSection />
      <SentContactRequestsSection />

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Zona de peligro</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            Eliminar tu cuenta borra tus productos, votos y comentarios. No hay vuelta atrás.
          </p>
          <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Eliminar cuenta
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="¿Eliminar tu cuenta?"
        description="Esta acción es permanente. Confirma con tu contraseña."
      >
        <form onSubmit={onDelete} className="space-y-4" noValidate>
          <Field id="del-password" label="Contraseña">
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
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={del.submitting || !password}>
              {del.submitting ? "Eliminando…" : "Eliminar definitivamente"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
