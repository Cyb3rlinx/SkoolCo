"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Handshake } from "lucide-react";
import { ApiClientError, markProductSold, updateProduct } from "@/lib/frontend/api-client";
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
  offerViewCount,
  soldAt,
  onUpdated,
}: {
  slug: string;
  makerId: string;
  openToOffers?: boolean;
  declaredMrrUsd?: number | null;
  monetizationNote?: string | null;
  offerViewCount?: number;
  soldAt?: string | null;
  onUpdated: () => void;
}) {
  const t = useTranslations("product.offerSettings");
  const tOfferCard = useTranslations("product.offerCard");
  const { data: session } = useSession();
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(Boolean(openToOffers));
  const [mrr, setMrr] = useState(declaredMrrUsd != null ? String(declaredMrrUsd) : "");
  const [note, setNote] = useState(monetizationNote ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  if (session?.user?.id !== makerId) return null;

  async function onMarkSold() {
    if (!window.confirm(t("confirmSold"))) return;
    setMarking(true);
    try {
      await markProductSold(slug);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errorMarkSold"));
    } finally {
      setMarking(false);
    }
  }

  if (soldAt) {
    return (
      <Card className="border-dashed">
        <CardContent className="space-y-1 p-5">
          <p className="flex items-center gap-2 text-sm font-bold">
            <Handshake className="h-4 w-4 text-primary" aria-hidden />
            {t("soldTitle")}
          </p>
          <p className="text-xs text-muted-foreground">{t("soldDescription")}</p>
        </CardContent>
      </Card>
    );
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const mrrValue = mrr.trim() === "" ? null : Number(mrr);
    if (mrrValue !== null && (!Number.isInteger(mrrValue) || mrrValue < 0)) {
      setError(t("errorMrrInvalid"));
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
      setError(err instanceof ApiClientError ? err.message : t("errorSaveGeneric"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-dashed">
      <CardContent className="space-y-3 p-5">
        <p className="flex items-center gap-2 text-sm font-bold">
          <Handshake className="h-4 w-4 text-primary" aria-hidden />
          {t("panelTitle")}
        </p>

        {!editing ? (
          <>
            <p className="text-xs text-muted-foreground">
              {openToOffers
                ? `${t("statusOpenBase")}${
                    declaredMrrUsd != null
                      ? t("statusOpenMrrSuffix", { amount: declaredMrrUsd.toLocaleString("en-US") })
                      : ""
                  }.`
                : t("statusClosed")}
            </p>
            {openToOffers && (
              <p className="text-xs text-muted-foreground">
                {(offerViewCount ?? 0) > 0
                  ? t(offerViewCount === 1 ? "viewsCountOne" : "viewsCountOther", {
                      count: (offerViewCount ?? 0).toLocaleString("en-US"),
                    })
                  : t("viewsCountZero")}
              </p>
            )}
            {error && <Alert variant="destructive">{error}</Alert>}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                {t("configure")}
              </Button>
              {openToOffers && (
                <Button variant="ghost" size="sm" disabled={marking} onClick={onMarkSold}>
                  {marking ? t("marking") : t("markSold")}
                </Button>
              )}
            </div>
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
              {tOfferCard("openToOffers")}
            </label>
            <div className="space-y-1">
              <label htmlFor="offer-mrr" className="text-xs font-semibold">
                {t("mrrLabel")}
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
                {t("noteLabel")}
              </label>
              <Input
                id="offer-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
                placeholder={t("notePlaceholder")}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">{t("disclaimer")}</p>
            {error && <Alert variant="destructive">{error}</Alert>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? t("saving") : t("save")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                {tOfferCard("cancel")}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
