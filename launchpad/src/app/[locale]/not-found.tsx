import { Compass } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-5 py-16 text-center">
      <span className="brand-gradient flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lift">
        <Compass className="h-8 w-8" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-primary">{t("eyebrow")}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{t("title")}</h1>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">{t("description")}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/" className={buttonVariants({ variant: "gradient" })}>
          {t("home")}
        </Link>
        <Link href="/launches" className={buttonVariants({ variant: "outline" })}>
          {t("launches")}
        </Link>
      </div>
    </div>
  );
}
