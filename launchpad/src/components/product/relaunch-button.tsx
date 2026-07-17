"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Rocket } from "lucide-react";
import { relaunchProduct, ApiClientError } from "@/lib/frontend/api-client";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

/**
 * Clona un producto ARCHIVADO en un DRAFT nuevo (nuevo slug, sin votos ni
 * comentarios) y lleva al maker a editarlo. Solo el dueño, solo si está
 * archivado.
 */
export function RelaunchButton({
  slug,
  makerId,
  status,
}: {
  slug: string;
  makerId: string;
  status: string;
}) {
  const t = useTranslations("product.relaunch");
  const { data: session } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session?.user?.id !== makerId || status !== "ARCHIVED") return null;

  async function onRelaunch() {
    setError(null);
    setBusy(true);
    try {
      const relaunch = await relaunchProduct(slug);
      router.push(`/products/${relaunch.slug}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errorGeneric"));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" disabled={busy} onClick={onRelaunch}>
        <Rocket className="h-3.5 w-3.5" aria-hidden />
        {busy ? t("relaunching") : t("cta")}
      </Button>
      {error && <Alert variant="destructive">{error}</Alert>}
    </div>
  );
}
