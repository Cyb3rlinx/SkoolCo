import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CollectionsClient } from "./collections-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("collections");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default function CollectionsPage() {
  return <CollectionsClient />;
}
