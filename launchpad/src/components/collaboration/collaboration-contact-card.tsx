"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Handshake } from "lucide-react";
import { ApiClientError, requestCollaborationContact } from "@/lib/frontend/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Link } from "@/i18n/navigation";

export function CollaborationContactCard({
  collaborationId,
  authorId,
}: {
  collaborationId: string;
  authorId: string;
}) {
  const t = useTranslations("collaborations");
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const isAuthor = session?.user?.id === authorId;
  if (isAuthor) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await requestCollaborationContact(collaborationId, message.trim());
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
          {t("requestContact")}
        </p>

        {sent ? (
          <Alert>{t("requestSent")}</Alert>
        ) : status === "authenticated" ? (
          <Button size="sm" className="w-full" onClick={() => setOpen(true)}>
            {t("requestContact")}
          </Button>
        ) : (
          <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" }) + " w-full"}>
            {t("loginToRequest")}
          </Link>
        )}
      </CardContent>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("contactDialogTitle")}
        description={t("contactDialogDescription")}
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
          <p className="text-xs text-muted-foreground">{t("minChars", { count: message.trim().length })}</p>
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
