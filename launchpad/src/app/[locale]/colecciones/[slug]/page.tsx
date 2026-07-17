import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CollectionDetailClient } from "./collection-detail-client";

interface Props {
  params: { slug: string };
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("collections");
  return { title: t("detailMetaTitle") };
}

export default function CollectionDetailPage({ params }: Props) {
  return <CollectionDetailClient slug={params.slug} />;
}
