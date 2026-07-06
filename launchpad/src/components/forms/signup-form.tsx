"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { registerUser } from "@/lib/frontend/api-client";
import { ApiClientError } from "@/lib/frontend/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Field } from "./field";

type FieldErrors = Partial<Record<"name" | "email" | "password", string>>;

/**
 * Registration → POST /api/auth/register, then automatic credentials
 * sign-in. The backend rejects passwords found in known breaches
 * (HaveIBeenPwned) — that error surfaces here as a normal message.
 */
export function SignupForm({ next }: { next?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      await registerUser({ name, email, password });
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ApiClientError) {
        // Zod validation errors arrive as { field: [messages] } in details.
        const details = err.details as Record<string, string[]> | undefined;
        if (err.status === 400 && details) {
          setFieldErrors({
            name: details.name?.[0],
            email: details.email?.[0],
            password: details.password?.[0],
          });
        }
        setError(err.message);
      } else {
        setError("No pudimos crear tu cuenta. Intenta de nuevo.");
      }
      return;
    }

    // Account created — sign in with the same credentials.
    const res = await signIn("credentials", { email, password, redirect: false });
    setSubmitting(false);

    if (res?.error) {
      // Rare (e.g. rate limit right after registering): send them to login.
      router.push("/login");
      return;
    }

    router.push(next && next.startsWith("/") ? next : "/launches");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field id="signup-name" label="Nombre" error={fieldErrors.name} hint="Así te verá la comunidad.">
        <Input
          id="signup-name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ana Maker"
          minLength={2}
          maxLength={80}
          required
        />
      </Field>

      <Field id="signup-email" label="Email" error={fieldErrors.email}>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
        />
      </Field>

      <Field
        id="signup-password"
        label="Contraseña"
        error={fieldErrors.password}
        hint="Mínimo 8 caracteres. Rechazamos contraseñas filtradas en brechas conocidas."
      >
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          minLength={8}
          maxLength={128}
          required
        />
      </Field>

      {error && <Alert variant="destructive">{error}</Alert>}

      <Button type="submit" variant="gradient" className="w-full" disabled={submitting}>
        {submitting ? "Creando cuenta…" : "Crear cuenta"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Al crear tu cuenta aceptas participar con respeto: la comunidad se modera activamente.
      </p>
    </form>
  );
}
