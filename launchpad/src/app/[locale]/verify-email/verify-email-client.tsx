"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { resendVerification, verifyEmail } from "@/lib/frontend/api-client";
import { useMutation } from "@/lib/frontend/hooks";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Field } from "@/components/forms/field";

type Status = "idle" | "verifying" | "ok" | "failed";

/**
 * Auto-verifies on mount with the token from the URL
 * (POST /api/auth/verify-email). Verification does NOT block login today —
 * the badge simply unlocks once this succeeds.
 */
export function VerifyEmailClient({ token }: { token?: string }) {
  const [status, setStatus] = useState<Status>(token ? "verifying" : "idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    verifyEmail(token)
      .then(() => !cancelled && setStatus("ok"))
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : "Token inválido o expirado.");
        setStatus("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Resend flow (also covers the no-token case).
  const [email, setEmail] = useState("");
  const [resent, setResent] = useState(false);
  const { mutate, submitting, error } = useMutation(resendVerification);

  async function onResend(e: FormEvent) {
    e.preventDefault();
    const result = await mutate(email);
    if (result !== null) setResent(true);
  }

  if (status === "verifying") {
    return (
      <div className="flex items-center justify-center gap-3 py-6 text-sm text-muted-foreground">
        <Spinner /> Verificando tu email…
      </div>
    );
  }

  if (status === "ok") {
    return (
      <div className="space-y-4">
        <Alert variant="success">
          ¡Listo! Tu email quedó verificado. Gracias por confirmar tu identidad ✅
        </Alert>
        <Link href="/launches" className={`${buttonVariants({ variant: "gradient" })} w-full`}>
          Ir a los lanzamientos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {status === "failed" ? (
        <Alert variant="destructive">
          {errorMsg} — puedes pedir un enlace nuevo abajo.
        </Alert>
      ) : (
        <Alert>
          Falta el token de verificación. Abre el enlace del correo, o pide uno nuevo con tu
          email.
        </Alert>
      )}

      {resent ? (
        <Alert variant="success">
          Si existe una cuenta con <strong>{email}</strong>, ya tiene un correo nuevo de
          verificación.
        </Alert>
      ) : (
        <form onSubmit={onResend} className="space-y-4" noValidate>
          <Field id="verify-email-input" label="Tu email">
            <Input
              id="verify-email-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
            />
          </Field>
          {error && <Alert variant="destructive">{error}</Alert>}
          <Button type="submit" variant="outline" className="w-full" disabled={submitting}>
            {submitting ? "Enviando…" : "Reenviar verificación"}
          </Button>
        </form>
      )}
    </div>
  );
}
