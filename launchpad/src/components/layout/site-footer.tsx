import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "./logo";

// TODO(content): Normas, Novedades, Guías, Centro de ayuda, Contacto, Acerca de,
// Privacidad y Términos aún no existen como páginas — el 404 con marca los cubre
// mientras tanto. Reemplazar cuando haya contenido real (Privacidad/Términos son
// requisito para publicar la extensión en la Chrome Web Store).
function useColumns() {
  const t = useTranslations("footer");
  return [
    {
      title: t("columnPlatform"),
      links: [
        { label: t("launches"), href: "/launches" },
        { label: t("leaderboard"), href: "/leaderboard" },
        { label: t("extension"), href: "/extension" },
        { label: t("submit"), href: "/submit" },
      ],
    },
    {
      title: t("columnCommunity"),
      links: [
        { label: t("howItWorks"), href: "/#como-funciona" },
        { label: t("makers"), href: "/leaderboard" },
        { label: t("achievements"), href: "/logros" },
        { label: t("rules"), href: "/normas" },
        { label: t("news"), href: "/novedades" },
      ],
    },
    {
      title: t("columnResources"),
      links: [
        { label: t("guides"), href: "/guias" },
        { label: t("help"), href: "/ayuda" },
        { label: t("contact"), href: "/contacto" },
        { label: t("apiDocs"), href: "/api/docs" },
      ],
    },
    {
      title: t("columnCompany"),
      links: [
        { label: t("about"), href: "/acerca" },
        { label: t("privacy"), href: "/privacidad" },
        { label: t("terms"), href: "/terminos" },
      ],
    },
  ];
}

export function SiteFooter() {
  const t = useTranslations("footer");
  const columns = useColumns();

  return (
    <footer className="border-t bg-white">
      <div className="container-page grid grid-cols-2 gap-x-6 gap-y-10 py-14 sm:grid-cols-3 lg:grid-cols-6">
        <div className="col-span-2 space-y-3 sm:col-span-3 lg:col-span-2">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">{t("tagline")}</p>
        </div>
        {columns.map((col) => (
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
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
          <p>{t("mvpNote")}</p>
        </div>
      </div>
    </footer>
  );
}
