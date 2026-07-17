"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

/** Formulario público de contacto — POST /api/contact (sin sesión). */
export function ContactForm() {
  const t = useTranslations("contact.form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (message.trim().length < 10) {
      setError(t("errorTooShort"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) {
        // Server-side error message (out of scope for translation — see
        // API route validators).
        const body = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(body?.error?.message ?? t("errorGeneric"));
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return <Alert variant="success">{t("success")}</Alert>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1">
        <label htmlFor="contact-name" className="text-sm font-semibold">
          {t("name")}
        </label>
        <Input
          id="contact-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
          placeholder={t("namePlaceholder")}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="contact-email" className="text-sm font-semibold">
          {t("email")}
        </label>
        <Input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={254}
          placeholder={t("emailPlaceholder")}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="contact-message" className="text-sm font-semibold">
          {t("message")}
        </label>
        <textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={10}
          maxLength={2000}
          rows={6}
          placeholder={t("messagePlaceholder")}
          className="w-full rounded-xl border bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      {error && <Alert variant="destructive">{error}</Alert>}
      <Button type="submit" disabled={busy}>
        {busy ? t("sending") : t("send")}
      </Button>
    </form>
  );
}
