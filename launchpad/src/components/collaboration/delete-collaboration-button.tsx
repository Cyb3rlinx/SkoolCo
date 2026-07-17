"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Trash2 } from "lucide-react";
import { deleteCollaboration } from "@/lib/frontend/api-client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";

export function DeleteCollaborationButton({
  collaborationId,
  authorId,
}: {
  collaborationId: string;
  authorId: string;
}) {
  const t = useTranslations("collaborations");
  const { data: session } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const isStaff = session?.user?.role === "ADMIN" || session?.user?.role === "MODERATOR";
  const canDelete = session?.user?.id === authorId || isStaff;
  if (!canDelete) return null;

  async function onDelete() {
    setBusy(true);
    try {
      await deleteCollaboration(collaborationId);
      router.push("/colaboraciones");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setOpen(true)}>
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        {t("deleteTitle")}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t("deleteTitle")} description={t("deleteConfirm")}>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button variant="destructive" disabled={busy} onClick={onDelete}>
            {busy ? t("deleting") : t("deleteAction")}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
