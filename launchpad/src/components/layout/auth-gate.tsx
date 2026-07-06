"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Lock, ShieldAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Client-side gate for pages that need a session (and optionally a staff
 * role). This is UX-level protection only — real authorization lives in the
 * API (requireUser / requireModerator).
 */
export function AuthGate({
  children,
  title = "Necesitas una cuenta",
  description = "Inicia sesión o crea tu cuenta gratis para continuar.",
  requireStaff = false,
}: {
  children: ReactNode;
  title?: string;
  description?: string;
  requireStaff?: boolean;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status === "loading") {
    return (
      <div className="space-y-4 py-4" aria-busy="true" aria-label="Comprobando tu sesión">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed bg-muted/40 px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Lock className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <p className="text-lg font-extrabold">{title}</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Link
            href={`/signup?next=${encodeURIComponent(pathname)}`}
            className={buttonVariants({ variant: "gradient" })}
          >
            Crear cuenta gratis
          </Link>
          <Link
            href={`/login?next=${encodeURIComponent(pathname)}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  const role = session.user.role;
  if (requireStaff && role !== "ADMIN" && role !== "MODERATOR") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed bg-muted/40 px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/15 text-warning">
          <ShieldAlert className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <p className="text-lg font-extrabold">Acceso solo para moderación</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Esta sección es para el equipo de moderación. Si crees que deberías tener acceso,
            habla con el equipo admin.
          </p>
        </div>
        <Link href="/launches" className={buttonVariants({ variant: "outline" })}>
          Volver a lanzamientos
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
