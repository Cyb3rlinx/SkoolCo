"use client";

import { useState, type FormEvent } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Flag } from "lucide-react";
import { createReport } from "@/lib/frontend/api-client";
import { useMutation } from "@/lib/frontend/hooks";
import type { ReportCategory } from "@/lib/frontend/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";

const CATEGORY_LABEL: Record<ReportCategory, string> = {
  SPAM: "Spam",
  SCAM: "Estafa o fraude",
  INAPPROPRIATE: "Contenido inapropiado",
  OTHER: "Otro",
};

/**
 * Report-a-product flow → POST /api/reports. Reports land in the moderation
 * queue (/admin). Signed-out users are sent to /login first.
 */
export function ReportButton({ productId }: { productId: string }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState<ReportCategory>("OTHER");
  const [done, setDone] = useState(false);
  const { mutate, submitting, error } = useMutation(createReport);

  function openDialog() {
    if (status !== "authenticated") {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setDone(false);
    setReason("");
    setCategory("OTHER");
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const result = await mutate({ productId, reason: reason.trim(), category });
    if (result) setDone(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-destructive"
      >
        <Flag className="h-3.5 w-3.5" aria-hidden />
        Reportar
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Reportar este producto"
        description="Cuéntanos qué está mal. El equipo de moderación lo revisará."
      >
        {done ? (
          <div className="space-y-4">
            <Alert variant="success">
              Gracias por avisar. Tu reporte quedó en la cola de moderación.
            </Alert>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="report-category">Categoría</Label>
              <Select
                id="report-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ReportCategory)}
              >
                {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej.: contenido engañoso, spam, enlace roto…"
              aria-label="Motivo del reporte"
              minLength={5}
              maxLength={1000}
              required
              autoFocus
            />
            {error && <Alert variant="destructive">{error}</Alert>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={submitting || reason.trim().length < 5}>
                {submitting ? "Enviando…" : "Enviar reporte"}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
