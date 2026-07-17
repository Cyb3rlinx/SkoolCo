import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LogrosClient } from "./logros-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("achievements");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default function LogrosPage() {
  return <LogrosClient />;
}
