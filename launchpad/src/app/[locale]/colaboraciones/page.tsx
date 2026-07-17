import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ColaboracionesClient } from "./colaboraciones-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("collaborations");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default function ColaboracionesPage() {
  return <ColaboracionesClient />;
}
