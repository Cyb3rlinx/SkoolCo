import Link from "next/link";
import { Logo } from "./logo";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Plataforma",
    links: [
      { label: "Lanzamientos", href: "/launches" },
      { label: "Ranking de la comunidad", href: "/leaderboard" },
      { label: "Publicar un producto", href: "/submit" },
    ],
  },
  {
    title: "Comunidad",
    links: [
      { label: "Extensión Logros", href: "/extension" },
      { label: "Crear cuenta", href: "/signup" },
      { label: "Iniciar sesión", href: "/login" },
    ],
  },
  {
    title: "Recursos",
    links: [
      // TODO(content): replace with real docs/blog/terms pages when they exist.
      { label: "API para desarrolladores", href: "/api/docs" },
      { label: "Moderación", href: "/admin" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            La plataforma de lanzamientos impulsada por tu comunidad: publica tu proyecto,
            recibe feedback real y gana visibilidad.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title} className="space-y-3">
            <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {col.title}
            </p>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted-foreground sm:flex-row">
          <p>Hecho con cariño por y para la comunidad. © {new Date().getFullYear()} LaunchPad.</p>
          <p>MVP — feedback bienvenido 💜</p>
        </div>
      </div>
    </footer>
  );
}
