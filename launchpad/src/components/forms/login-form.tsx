"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Link, useRouter } from "@/i18n/navigation";
import { Field } from "./field";

/**
 * Credentials sign-in via NextAuth (POST /api/auth/callback/credentials).
 * The backend rate-limits by email and IP; a limited attempt is
 * indistinguishable from bad credentials by design, so the error copy
 * covers both.
 */
export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("auth.login");
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
      setError(res.error === "Tu cuenta está suspendida." ? t("errorSuspended") : t("errorInvalid"));
      return;
    }

    router.push(next && next.startsWith("/") ? next : "/launches");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field id="login-email" label={t("email")}>
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

      <Field id="login-password" label={t("password")}>
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
        {submitting ? t("submitting") : t("submit")}
      </Button>

      <p className="text-center text-sm">
        <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
          {t("forgotPassword")}
        </Link>
      </p>
    </form>
  );
}
