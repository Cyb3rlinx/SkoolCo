import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

/** Shared shell for text/legal pages (Privacidad, Términos, Normas). */
export async function ProsePage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  const t = await getTranslations("legal");
  return (
    <div className="container-page max-w-3xl py-12">
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("lastUpdated")} {updated}
      </p>
      <div className="mt-8 space-y-6 leading-relaxed [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-extrabold [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6 [&_p]:text-foreground/90 [&_li]:text-foreground/90">
        {children}
      </div>
    </div>
  );
}
