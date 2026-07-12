"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState, type FormEvent } from "react";
import { ImagePlus } from "lucide-react";
import { ApiClientError, updateMe, uploadImage } from "@/lib/frontend/api-client";
import { useMutation } from "@/lib/frontend/hooks";
import type { MeProfile } from "@/lib/frontend/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Field } from "./field";

/** Edit name / bio / avatarUrl → PATCH /api/me. */
export function ProfileForm({
  profile,
  onSaved,
  onCancel,
}: {
  profile: MeProfile;
  onSaved: (updated: MeProfile) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate, submitting, error } = useMutation(updateMe);

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setUploadError("Usa PNG, JPG o WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Máximo 2MB.");
      return;
    }

    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      setAvatarUrl(url);
    } catch (err) {
      setUploadError(
        err instanceof ApiClientError ? err.message : "No pudimos subir la imagen."
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const updated = await mutate({
      name: name.trim(),
      bio: bio.trim(),
      avatarUrl: avatarUrl.trim() || null,
    });
    if (updated) onSaved(updated);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field id="pf-name" label="Nombre">
        <Input
          id="pf-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={80}
          required
        />
      </Field>

      <Field id="pf-bio" label="Bio" optional hint={`Cuenta en qué andas. ${bio.length}/500`}>
        <Textarea
          id="pf-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          placeholder="Indie hacker lanzando cosas cada semana…"
        />
      </Field>

      <Field
        id="pf-avatar"
        label="Avatar"
        optional
        error={uploadError ?? undefined}
        hint="Sube una imagen PNG, JPG o WebP (máx. 2MB), o pega una URL pública."
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-60"
            aria-label="Subir imagen de avatar"
            aria-busy={uploading}
          >
            {uploading ? (
              <span className="text-[9px] font-semibold">Subiendo…</span>
            ) : avatarUrl ? (
              <img src={avatarUrl} alt="Vista previa del avatar" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-5 w-5" aria-hidden />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={onPickAvatar}
            aria-hidden
            tabIndex={-1}
          />
          <Input
            id="pf-avatar"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://…/avatar.png"
          />
        </div>
      </Field>

      {error && <Alert variant="destructive">{error}</Alert>}

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Guardando…" : "Guardar cambios"}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
