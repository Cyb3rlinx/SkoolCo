"use client";

import { useState, type FormEvent } from "react";
import { forgotPassword } from "@/lib/frontend/api-client";
import { useMutation } from "@/lib/frontend/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Field } from "./field";

/**
 * POST /api/auth/forgot-password. The endpoint always answers 200 (no user
 * enumeration), so on success we show a neutral "revisa tu correo" message.
 * Without RESEND_API_KEY configured, the email is logged to the server
 * console — handy in dev.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const { mutate, submitting, error } = useMutation(forgotPassword);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const result = await mutate(email);
    if (result !== null) setSent(true);
  }

  if (sent) {
    return (
      <Alert variant="success">
        Si existe una cuenta con <strong>{email}</strong>, ya tiene un correo con el enlace de
        recuperación (válido por 1 hora). Revisa también spam.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field id="forgot-email" label="Email">
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
        />
      </Field>

      {error && <Alert variant="destructive">{error}</Alert>}

      <Button type="submit" variant="gradient" className="w-full" disabled={submitting}>
        {submitting ? "Enviando…" : "Enviar enlace de recuperación"}
      </Button>
    </form>
  );
}
