"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { BadgeDollarSign, Handshake } from "lucide-react";
import { ApiClientError, requestContact } from "@/lib/frontend/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";

/**
 * Tarjeta pública del puente de compraventa: badge "Abierto a ofertas",
 * MRR declarado (con disclaimer) y solicitud de contacto. Solo se muestra
 * si el maker activó openToOffers; el propio maker no la ve (él tiene
 * OfferSettings). Nada de precios ni negociación dentro de la plataforma.
 */
export function OfferCard({
  slug,
  makerId,
  openToOffers,
  declaredMrrUsd,
  monetizationNote,
  mrrVerifiedAt,
}: {
  slug: string;
  makerId: string;
  openToOffers?: boolean;
  declaredMrrUsd?: number | null;
  monetizationNote?: string | null;
  mrrVerifiedAt?: string | null;
}) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const isMaker = session?.user?.id === makerId;
  if (!openToOffers || isMaker) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await requestContact(slug, message.trim());
      setSent(true);
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "No pudimos enviar tu solicitud."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-primary/25">
      <CardContent className="space-y-3 p-5">
        <p className="flex items-center gap-2 text-sm font-bold">
          <Handshake className="h-4 w-4 text-primary" aria-hidden />
          Abierto a ofertas
        </p>

        {typeof declaredMrrUsd === "number" && (
          <div>
            <p className="flex items-center gap-1.5 text-sm">
              <BadgeDollarSign className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="font-semibold">
                MRR declarado: ${declaredMrrUsd.toLocaleString("en-US")}/mes
              </span>
              {mrrVerifiedAt && (
                <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                  Verificado ✓
                </span>
              )}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              {mrrVerifiedAt
                ? "Un admin de Denveler confirmó este dato con evidencia."
                : "Métrica declarada por el maker. Denveler no la verifica ni participa en la negociación."}
            </p>
          </div>
        )}

        {monetizationNote && (
          <p className="text-xs text-muted-foreground">Monetización: {monetizationNote}</p>
        )}

        {sent ? (
          <Alert>Solicitud enviada. El maker decidirá si comparte su contacto.</Alert>
        ) : status === "authenticated" ? (
          <Button size="sm" className="w-full" onClick={() => setOpen(true)}>
            Solicitar contacto
          </Button>
        ) : (
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline", size: "sm" }) + " w-full"}
          >
            Inicia sesión para solicitar contacto
          </Link>
        )}
      </CardContent>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Solicitar contacto"
        description="Cuéntale al maker quién eres y por qué te interesa. Si acepta, recibirás su email."
      >
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ej.: Soy operador de micro-SaaS, me interesa conocer más del producto y conversar una posible compra…"
            className="min-h-[120px]"
            maxLength={1000}
            required
          />
          <p className="text-xs text-muted-foreground">
            Mínimo 20 caracteres. {message.trim().length}/1000
          </p>
          {error && <Alert variant="destructive">{error}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy || message.trim().length < 20}>
              {busy ? "Enviando…" : "Enviar solicitud"}
            </Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}
