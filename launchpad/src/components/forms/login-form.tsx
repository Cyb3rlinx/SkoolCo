"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Field } from "./field";

/**
 * Credentials sign-in via NextAuth (POST /api/auth/callback/credentials).
 * The backend rate-limits by email and IP; a limited attempt is
 * indistinguishable from bad credentials by design, so the error copy
 * covers both.
 */
export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await signIn("credentials", { email, password, redirect: false });
    setSubmitting(false);

    if (res?.error) {
      setError(
        "Email o contraseña incorrectos. Si fallaste varias veces seguidas, espera unos minutos e intenta de nuevo."
      );
      return;
    }

    router.push(next && next.startsWith("/") ? next : "/launches");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field id="login-email" label="Email">
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
        />
      </Field>

      <Field id="login-password" label="Contraseña">
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
      </Field>

      {error && <Alert variant="destructive">{error}</Alert>}

      <Button type="submit" variant="gradient" className="w-full" disabled={submitting}>
        {submitting ? "Entrando…" : "Iniciar sesión"}
      </Button>

      <p className="text-center text-sm">
        <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    </form>
  );
}
