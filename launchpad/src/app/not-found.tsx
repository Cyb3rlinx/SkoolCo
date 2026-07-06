import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-5 py-16 text-center">
      <span className="brand-gradient flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lift">
        <Compass className="h-8 w-8" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-primary">Error 404</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Esta página se fue de lanzamiento</h1>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          El enlace no existe o el contenido ya no está disponible. Volvamos a algo con tracción.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/" className={buttonVariants({ variant: "gradient" })}>
          Ir al inicio
        </Link>
        <Link href="/launches" className={buttonVariants({ variant: "outline" })}>
          Ver lanzamientos
        </Link>
      </div>
    </div>
  );
}
