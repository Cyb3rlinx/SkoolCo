"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { resetPassword } from "@/lib/frontend/api-client";
import { useMutation } from "@/lib/frontend/hooks";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Field } from "./field";

/** POST /api/auth/reset-password with the token from the email link. */
export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const [done, setDone] = useState(false);
  const { mutate, submitting, error } = useMutation(resetPassword);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    const result = await mutate(token, password);
    if (result !== null) setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-4">
        <Alert variant="success">Contraseña actualizada. Ya puedes iniciar sesión.</Alert>
        <Link href="/login" className={`${buttonVariants({ variant: "gradient" })} w-full`}>
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field
        id="reset-password"
        label="Nueva contraseña"
        hint="Mínimo 8 caracteres; rechazamos contraseñas filtradas en brechas."
      >
        <Input
          id="reset-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          maxLength={128}
          required
        />
      </Field>

      <Field
        id="reset-confirm"
        label="Repite la contraseña"
        error={mismatch ? "Las contraseñas no coinciden." : undefined}
      >
        <Input
          id="reset-confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </Field>

      {error && (
        <Alert variant="destructive">
          {error} — si el enlace expiró,{" "}
          <Link href="/forgot-password" className="font-semibold underline">
            pide uno nuevo
          </Link>
          .
        </Alert>
      )}

      <Button type="submit" variant="gradient" className="w-full" disabled={submitting}>
        {submitting ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}
