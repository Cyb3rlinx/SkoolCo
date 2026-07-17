import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/forms/auth-shell";
import { ResetPasswordForm } from "@/components/forms/reset-password-form";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Nueva contraseña" };

/** Landing page for the link sent by /api/auth/forgot-password emails. */
export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;

  return (
    <AuthShell
      title="Crea una contraseña nueva"
      subtitle="El enlace es válido por 1 hora y de un solo uso."
      footer={
        <p>
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      }
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <Alert variant="destructive">
          Falta el token de recuperación. Abre el enlace exactamente como llegó en el correo, o{" "}
          <Link href="/forgot-password" className="font-semibold underline">
            pide uno nuevo
          </Link>
          .
        </Alert>
      )}
    </AuthShell>
  );
}
