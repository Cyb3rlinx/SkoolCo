import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/forms/auth-shell";
import { SignupForm } from "@/components/forms/signup-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function SignupPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <AuthShell
      title="Únete a la comunidad"
      subtitle="Lanza tus proyectos, apoya a otros makers y gana visibilidad."
      footer={
        <p>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      }
    >
      <SignupForm next={searchParams.next} />
    </AuthShell>
  );
}
