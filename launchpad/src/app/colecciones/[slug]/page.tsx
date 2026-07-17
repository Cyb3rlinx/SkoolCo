import type { Metadata } from "next";
import { CollectionDetailClient } from "./collection-detail-client";

interface Props {
  params: { slug: string };
}

export const metadata: Metadata = { title: "Colección" };

export default function CollectionDetailPage({ params }: Props) {
  return <CollectionDetailClient slug={params.slug} />;
}
