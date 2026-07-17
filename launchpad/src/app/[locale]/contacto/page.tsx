import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ContactForm } from "@/components/forms/contact-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function ContactoPage() {
  const t = await getTranslations("contact");
  return (
    <div className="container-page max-w-2xl py-12">
      <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
      <p className="mt-3 leading-relaxed text-foreground/90">
        {t("intro1")} <strong>{t("reportWord")}</strong> {t("intro2")}
      </p>
      <div className="mt-8">
        <ContactForm />
      </div>

      <div className="mt-10 border-t pt-8">
        <h2 className="text-lg font-extrabold">{t("directTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("directBody")}</p>
        <ul className="mt-4 space-y-2 text-sm">
          <li>
            <span className="font-semibold">William Díaz</span> —{" "}
            <a
              href="mailto:willydiaz9009@gmail.com"
              className="font-semibold text-primary hover:underline"
            >
              willydiaz9009@gmail.com
            </a>
          </li>
          <li>
            <span className="font-semibold">Kevin</span> —{" "}
            <a
              href="mailto:keev.seven@hotmail.com"
              className="font-semibold text-primary hover:underline"
            >
              keev.seven@hotmail.com
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
