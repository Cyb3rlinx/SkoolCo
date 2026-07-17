"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { createCollaboration } from "@/lib/frontend/api-client";
import { useMutation } from "@/lib/frontend/hooks";
import type { CollaborationType } from "@/lib/frontend/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

export function CreateCollaborationDialog({ onCreated }: { onCreated: () => void }) {
  const t = useTranslations("collaborations");
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CollaborationType>("NEEDS");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const { mutate, submitting, error, clearError } = useMutation(createCollaboration);

  function openDialog() {
    clearError();
    setType("NEEDS");
    setTitle("");
    setDescription("");
    setTags("");
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedTags = tags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const result = await mutate({ type, title: title.trim(), description: description.trim(), tags: parsedTags });
    if (result) {
      setOpen(false);
      onCreated();
    }
  }

  return (
    <>
      <Button onClick={openDialog} className={buttonVariants({ variant: "gradient" })}>
        <Plus className="h-4 w-4" aria-hidden />
        {t("publish")}
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("createDialogTitle")}
        description={t("createDialogDescription")}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="collab-type">{t("fieldType")}</Label>
            <Select id="collab-type" value={type} onChange={(e) => setType(e.target.value as CollaborationType)}>
              <option value="NEEDS">{t("typeNeeds")}</option>
              <option value="OFFERS">{t("typeOffers")}</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="collab-title">{t("fieldTitle")}</Label>
            <Input
              id="collab-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("fieldTitlePlaceholder")}
              maxLength={120}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="collab-description">{t("fieldDescription")}</Label>
            <Textarea
              id="collab-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("fieldDescriptionPlaceholder")}
              className="min-h-[120px]"
              maxLength={2000}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="collab-tags">{t("fieldTags")}</Label>
            <Input
              id="collab-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={t("fieldTagsPlaceholder")}
            />
          </div>
          {error && <Alert variant="destructive">{error}</Alert>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={submitting || title.trim().length < 5 || description.trim().length < 20}>
              {submitting ? t("publishing") : t("publishAction")}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
