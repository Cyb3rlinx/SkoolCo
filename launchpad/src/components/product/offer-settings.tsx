"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Handshake } from "lucide-react";
import { ApiClientError, updateProduct } from "@/lib/frontend/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

/**
 * Panel del maker (solo él lo ve) para activar "Abierto a ofertas" y declarar
 * MRR/monetización. Guarda vía PATCH /api/products/:slug (endpoint existente).
 */
export function OfferSettings({
  slug,
  makerId,
  openToOffers,
  declaredMrrUsd,
  monetizationNote,
  onUpdated,
}: {
  slug: string;
  makerId: string;
  openToOffers?: boolean;
  declaredMrrUsd?: number | null;
  monetizationNote?: string | null;
  onUpdated: () => void;
}) {
  const { data: session } = useSession();
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(Boolean(openToOffers));
  const [mrr, setMrr] = useState(declaredMrrUsd != null ? String(declaredMrrUsd) : "");
  const [note, setNote] = useState(monetizationNote ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session?.user?.id !== makerId) return null;

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const mrrValue = mrr.trim() === "" ? null : Number(mrr);
    if (mrrValue !== null && (!Number.isInteger(mrrValue) || mrrValue < 0)) {
      setError("El MRR debe ser un número entero positivo (USD/mes).");
      return;
    }
    setBusy(true);
    try {
      await updateProduct(slug, {
        openToOffers: open,
        declaredMrrUsd: mrrValue,
        monetizationNote: note.trim() || null,
      });
      setEditing(false);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-dashed">
      <CardContent className="space-y-3 p-5">
        <p className="flex items-center gap-2 text-sm font-bold">
          <Handshake className="h-4 w-4 text-primary" aria-hidden />
          Ofertas (solo tú ves esto)
        </p>

        {!editing ? (
          <>
            <p className="text-xs text-muted-foreground">
              {openToOffers
                ? `Tu producto está abierto a ofertas${
                    declaredMrrUsd != null
                      ? ` · MRR declarado $${declaredMrrUsd.toLocaleString("en-US")}/mes`
                      : ""
                  }.`
                : "Activa esto si te interesa recibir solicitudes de compra por tu producto."}
            </p>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Configurar
            </Button>
          </>
        ) : (
          <form onSubmit={onSave} className="space-y-3" noValidate>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={open}
                onChange={(e) => setOpen(e.target.checked)}
                className="h-4 w-4 accent-[hsl(var(--primary))]"
              />
              Abierto a ofertas
            </label>
            <div className="space-y-1">
              <label htmlFor="offer-mrr" className="text-xs font-semibold">
                MRR declarado (USD/mes, opcional)
              </label>
              <Input
                id="offer-mrr"
                inputMode="numeric"
                value={mrr}
                onChange={(e) => setMrr(e.target.value)}
                placeholder="1500"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="offer-note" className="text-xs font-semibold">
                Cómo monetiza (opcional)
              </label>
              <Input
                id="offer-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
                placeholder="Suscripciones, ads, one-time…"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Las métricas son declaradas bajo tu responsabilidad; Denveler no las verifica.
            </p>
            {error && <Alert variant="destructive">{error}</Alert>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? "Guardando…" : "Guardar"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
