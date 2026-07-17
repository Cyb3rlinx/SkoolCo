"use client";

import { useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { Rss } from "lucide-react";
import { fetchProductUpdates, postProductUpdate } from "@/lib/frontend/api-client";
import { useApi, useMutation } from "@/lib/frontend/hooks";
import { timeAgo } from "@/lib/frontend/format";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Bitácora de progreso — updates cortos que el maker publica en su propio
 * producto. Público para leer; solo el maker dueño (o staff) puede publicar.
 */
export function ProductUpdatesSection({ slug, makerId }: { slug: string; makerId: string }) {
  const { data: session } = useSession();
  const isOwner = session?.user?.id === makerId;
  const [body, setBody] = useState("");

  const { data, loading, setData } = useApi(() => fetchProductUpdates(slug), { deps: [slug] });
  const { mutate, submitting, error, clearError } = useMutation(postProductUpdate);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    const update = await mutate(slug, text);
    if (update) {
      setBody("");
      setData((prev) => (prev ? [update, ...prev] : [update]));
    }
  }

  // Sin updates y sin permiso de publicar → no ocupar espacio.
  if (!loading && (data?.length ?? 0) === 0 && !isOwner) return null;

  return (
    <section aria-labelledby="updates-title" className="space-y-4">
      <h2 id="updates-title" className="flex items-center gap-2 text-xl font-extrabold">
        <Rss className="h-5 w-5 text-primary" aria-hidden />
        Bitácora de progreso
      </h2>

      {isOwner && (
        <form onSubmit={onSubmit} className="space-y-2">
          <Textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              if (error) clearError();
            }}
            placeholder="Cuenta una novedad, un avance o un cambio reciente…"
            aria-label="Escribir un update"
            maxLength={1000}
          />
          {error && <Alert variant="destructive">{error}</Alert>}
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={submitting || body.trim().length < 5}>
              {submitting ? "Publicando…" : "Publicar update"}
            </Button>
          </div>
        </form>
      )}

      {loading && <Skeleton className="h-16 w-full rounded-2xl" aria-busy="true" />}

      {!loading && (data?.length ?? 0) > 0 && (
        <ul className="space-y-3">
          {data?.map((u) => (
            <li key={u.id} className="rounded-2xl border bg-card p-4 shadow-soft">
              <p className="text-xs text-muted-foreground">{timeAgo(u.createdAt)}</p>
              <p className="mt-1 whitespace-pre-line text-sm text-foreground/90">{u.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
