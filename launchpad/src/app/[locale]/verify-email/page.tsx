import type { Metadata } from "next";
import { AuthShell } from "@/components/forms/auth-shell";
import { VerifyEmailClient } from "./verify-email-client";

export const metadata: Metadata = { title: "Verificar email" };

/** Landing page for the link sent by verification emails. */
export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  return (
    <AuthShell
      title="Verificación de email"
      subtitle="Confirmamos que este correo es tuyo."
    >
      <VerifyEmailClient token={searchParams.token} />
    </AuthShell>
  );
}
