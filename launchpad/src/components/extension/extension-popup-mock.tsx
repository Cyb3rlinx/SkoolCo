"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, Send, Trophy } from "lucide-react";
import { cn } from "@/lib/frontend/utils";
import { mockMyLinks } from "@/lib/frontend/mock-data";
import { Badge } from "@/components/ui/badge";

/**
 * Non-functional visual replica of the real Chrome extension popup
 * (extension/src/popup.html), shown on the /extension page so people
 * understand the flow before installing. It performs NO real actions — it is
 * a marketing mock. The real popup lives in the `extension/` package.
 */
type Tab = "send" | "mine";

const STATUS_META = {
  PENDING: { label: "Pendiente", variant: "warning" as const },
  VERIFIED: { label: "Verificado", variant: "success" as const },
  REJECTED: { label: "Rechazado", variant: "outline" as const },
};

export function ExtensionPopupMock() {
  const [tab, setTab] = useState<Tab>("send");
  const [title, setTitle] = useState("¡Llegué a 100 usuarios! 🎉");
  const [type, setType] = useState("logro");
  const [sent, setSent] = useState(false);

  return (
    <div className="mx-auto w-[340px] max-w-full overflow-hidden rounded-3xl border bg-card shadow-lift">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 border-b bg-muted/60 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/60" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-success/60" aria-hidden />
        <span className="ml-2 text-[10px] font-medium text-muted-foreground">Extensión · Logros</span>
      </div>

      {/* Popup header */}
      <div className="flex items-center gap-2 px-4 pt-4">
        <span className="brand-gradient flex h-8 w-8 items-center justify-center rounded-lg text-white">
          <Trophy className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-extrabold leading-none">Logros</p>
          <p className="text-[10px] text-muted-foreground">Apoya a tu comunidad, con tu permiso</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3">
        {(["send", "mine"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
              tab === t ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {t === "send" ? "Enviar" : "Mis links"}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === "send" ? (
          sent ? (
            <div className="space-y-3 py-4 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden />
              <p className="text-sm font-bold">¡Enviado como pendiente!</p>
              <p className="text-xs text-muted-foreground">
                Un moderador lo verificará antes de publicarlo.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Enviar otro
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-dashed bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
                Post detectado en la pestaña activa:
                <span className="mt-1 flex items-center gap-1 font-semibold text-foreground">
                  <ExternalLink className="h-3 w-3" aria-hidden />
                  skool.com/tu-comunidad/post
                </span>
              </div>

              <label className="block space-y-1">
                <span className="text-[11px] font-bold">Título (editable)</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] font-bold">Tipo</span>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="logro">Logro</option>
                  <option value="milestone">Milestone</option>
                  <option value="announcement">Anuncio</option>
                </select>
              </label>

              <button
                type="button"
                onClick={() => setSent(true)}
                className="brand-gradient flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold text-white transition-opacity hover:opacity-95"
              >
                <Send className="h-3.5 w-3.5" aria-hidden />
                Enviar como logro
              </button>
              <p className="text-center text-[10px] text-muted-foreground">
                Solo se envía cuando tú haces clic. Nada automático.
              </p>
            </div>
          )
        ) : (
          <ul className="space-y-2">
            {mockMyLinks.map((l) => {
              const meta = STATUS_META[l.status];
              return (
                <li key={l.id} className="rounded-lg border p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold leading-snug">{l.title}</p>
                    <Badge variant={meta.variant} className="shrink-0 text-[9px]">
                      {meta.label}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-[10px] text-muted-foreground">{l.url}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="border-t bg-muted/40 px-4 py-2 text-center text-[10px] text-muted-foreground">
        Vista previa · la extensión real se instala desde el navegador
      </p>
    </div>
  );
}
