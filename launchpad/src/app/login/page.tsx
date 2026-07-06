import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/forms/auth-shell";
import { LoginForm } from "@/components/forms/login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <AuthShell
      title="Hola de nuevo 👋"
      subtitle="Entra para votar, comentar y lanzar tus productos."
      footer={
        <p>
          ¿Primera vez por aquí?{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Crea tu cuenta
          </Link>
        </p>
      }
    >
      <LoginForm next={searchParams.next} />
    </AuthShell>
  );
}
