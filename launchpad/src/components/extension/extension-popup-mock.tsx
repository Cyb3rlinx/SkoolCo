"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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

export function ExtensionPopupMock() {
  const t = useTranslations("extension.popupMock");
  const [tab, setTab] = useState<Tab>("send");
  const [title, setTitle] = useState(t("defaultTitle"));
  const [type, setType] = useState("logro");
  const [sent, setSent] = useState(false);

  const STATUS_META = {
    PENDING: { label: t("statusPending"), variant: "warning" as const },
    VERIFIED: { label: t("statusVerified"), variant: "success" as const },
    REJECTED: { label: t("statusRejected"), variant: "outline" as const },
  };

  return (
    <div className="mx-auto w-[340px] max-w-full overflow-hidden rounded-3xl border bg-card shadow-lift">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 border-b bg-muted/60 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/60" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-success/60" aria-hidden />
        <span className="ml-2 text-[10px] font-medium text-muted-foreground">{t("chromeLabel")}</span>
      </div>

      {/* Popup header */}
      <div className="flex items-center gap-2 px-4 pt-4">
        <span className="brand-gradient flex h-8 w-8 items-center justify-center rounded-lg text-white">
          <Trophy className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-extrabold leading-none">{t("panelTitle")}</p>
          <p className="text-[10px] text-muted-foreground">{t("panelSubtitle")}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3">
        {(["send", "mine"] as Tab[]).map((tb) => (
          <button
            key={tb}
            type="button"
            onClick={() => setTab(tb)}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
              tab === tb ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {tb === "send" ? t("tabSend") : t("tabMine")}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === "send" ? (
          sent ? (
            <div className="space-y-3 py-4 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden />
              <p className="text-sm font-bold">{t("sentTitle")}</p>
              <p className="text-xs text-muted-foreground">{t("sentBody")}</p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {t("sendAnother")}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-dashed bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
                {t("detectedPost")}
                <span className="mt-1 flex items-center gap-1 font-semibold text-foreground">
                  <ExternalLink className="h-3 w-3" aria-hidden />
                  skool.com/tu-comunidad/post
                </span>
              </div>

              <label className="block space-y-1">
                <span className="text-[11px] font-bold">{t("titleField")}</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] font-bold">{t("typeField")}</span>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="logro">{t("typeAchievement")}</option>
                  <option value="milestone">{t("typeMilestone")}</option>
                  <option value="announcement">{t("typeAnnouncement")}</option>
                </select>
              </label>

              <button
                type="button"
                onClick={() => setSent(true)}
                className="brand-gradient flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold text-white transition-opacity hover:opacity-95"
              >
                <Send className="h-3.5 w-3.5" aria-hidden />
                {t("sendAsAchievement")}
              </button>
              <p className="text-center text-[10px] text-muted-foreground">{t("onlyOnClick")}</p>
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
        {t("previewNote")}
      </p>
    </div>
  );
}
