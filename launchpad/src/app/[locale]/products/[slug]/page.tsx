import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { ProductDetailClient } from "./product-detail-client";

interface Props {
  params: { slug: string };
}

/** Real title/description for search results and social shares. The page body
 * stays client-fetched; this runs server-side only for metadata. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await prisma.product
    .findUnique({
      where: { slug: params.slug },
      select: { name: true, tagline: true, status: true },
    })
    .catch(() => null); // DB down → fall back to slug-derived title

  if (!product || product.status !== "LIVE") {
    const readable = params.slug.replace(/-/g, " ");
    return { title: readable.charAt(0).toUpperCase() + readable.slice(1) };
  }

  return {
    title: product.name,
    description: product.tagline,
    openGraph: { title: product.name, description: product.tagline },
    twitter: { card: "summary_large_image", title: product.name, description: product.tagline },
  };
}

export default function ProductDetailPage({ params }: Props) {
  return <ProductDetailClient slug={params.slug} />;
}
