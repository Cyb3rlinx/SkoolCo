"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { BadgeDollarSign, Handshake } from "lucide-react";
import { ApiClientError, requestContact } from "@/lib/frontend/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Link } from "@/i18n/navigation";

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
  const t = useTranslations("product.offerCard");
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
      setError(err instanceof ApiClientError ? err.message : t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-primary/25">
      <CardContent className="space-y-3 p-5">
        <p className="flex items-center gap-2 text-sm font-bold">
          <Handshake className="h-4 w-4 text-primary" aria-hidden />
          {t("openToOffers")}
        </p>

        {typeof declaredMrrUsd === "number" && (
          <div>
            <p className="flex items-center gap-1.5 text-sm">
              <BadgeDollarSign className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="font-semibold">
                {t("declaredMrr", { amount: declaredMrrUsd.toLocaleString("en-US") })}
              </span>
              {mrrVerifiedAt && (
                <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                  {t("verifiedBadge")}
                </span>
              )}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              {mrrVerifiedAt ? t("mrrDisclaimerVerified") : t("mrrDisclaimer")}
            </p>
          </div>
        )}

        {monetizationNote && (
          <p className="text-xs text-muted-foreground">
            {t("monetization")} {monetizationNote}
          </p>
        )}

        {sent ? (
          <Alert>{t("requestSent")}</Alert>
        ) : status === "authenticated" ? (
          <Button size="sm" className="w-full" onClick={() => setOpen(true)}>
            {t("requestContact")}
          </Button>
        ) : (
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline", size: "sm" }) + " w-full"}
          >
            {t("loginToRequest")}
          </Link>
        )}
      </CardContent>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("dialogTitle")}
        description={t("dialogDescription")}
      >
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("messagePlaceholder")}
            className="min-h-[120px]"
            maxLength={1000}
            required
          />
          <p className="text-xs text-muted-foreground">
            {t("minChars", { count: message.trim().length })}
          </p>
          {error && <Alert variant="destructive">{error}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={busy || message.trim().length < 20}>
              {busy ? t("sending") : t("sendRequest")}
            </Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}
