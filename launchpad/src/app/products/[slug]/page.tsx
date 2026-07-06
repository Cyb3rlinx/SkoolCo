import type { Metadata } from "next";
import { ProductDetailClient } from "./product-detail-client";

interface Props {
  params: { slug: string };
}

export function generateMetadata({ params }: Props): Metadata {
  // Data fetching is client-side (MVP); use the slug for a readable title.
  const readable = params.slug.replace(/-/g, " ");
  return { title: readable.charAt(0).toUpperCase() + readable.slice(1) };
}

export default function ProductDetailPage({ params }: Props) {
  return <ProductDetailClient slug={params.slug} />;
}
