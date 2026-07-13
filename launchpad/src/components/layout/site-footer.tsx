import Link from "next/link";
import { Logo } from "./logo";

// TODO(content): Normas, Novedades, Guías, Centro de ayuda, Contacto, Acerca de,
// Privacidad y Términos aún no existen como páginas — el 404 con marca los cubre
// mientras tanto. Reemplazar cuando haya contenido real (Privacidad/Términos son
// requisito para publicar la extensión en la Chrome Web Store).
const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Plataforma",
    links: [
      { label: "Lanzamientos", href: "/launches" },
      { label: "Ranking", href: "/leaderboard" },
      { label: "Extensión", href: "/extension" },
      { label: "Publicar un producto", href: "/submit" },
    ],
  },
  {
    title: "Comunidad",
    links: [
      { label: "Cómo funciona", href: "/#como-funciona" },
      { label: "Makers", href: "/leaderboard" },
      { label: "Normas", href: "/normas" },
      { label: "Novedades", href: "/novedades" },
    ],
  },
  {
    title: "Recursos",
    links: [
      { label: "Guías", href: "/guias" },
      { label: "Centro de ayuda", href: "/ayuda" },
      { label: "Contacto", href: "/contacto" },
      { label: "API para desarrolladores", href: "/api/docs" },
    ],
  },
  {
    title: "Compañía",
    links: [
      { label: "Acerca de", href: "/acerca" },
      { label: "Privacidad", href: "/privacidad" },
      { label: "Términos", href: "/terminos" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-white">
      <div className="container-page grid grid-cols-2 gap-x-6 gap-y-10 py-14 sm:grid-cols-3 lg:grid-cols-6">
        <div className="col-span-2 space-y-3 sm:col-span-3 lg:col-span-2">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            El lugar donde las comunidades apoyan productos reales. Votos honestos,
            feedback útil y visibilidad desde el día uno.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title} className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {col.title}
            </p>
            <ul className="space-y-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
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
          <p>Hecho con cariño por y para la comunidad. © {new Date().getFullYear()} Denveler.</p>
          <p>MVP — feedback bienvenido 💜</p>
        </div>
      </div>
    </footer>
  );
}
