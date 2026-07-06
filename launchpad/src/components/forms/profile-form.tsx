"use client";

import { useState, type FormEvent } from "react";
import { updateMe } from "@/lib/frontend/api-client";
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
  const { mutate, submitting, error } = useMutation(updateMe);

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
        label="Avatar (URL)"
        optional
        hint="TODO backend: subida de archivos. Por ahora, URL pública de imagen."
      >
        <Input
          id="pf-avatar"
          type="url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://…/avatar.png"
        />
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
