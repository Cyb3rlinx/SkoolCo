import type { Metadata } from "next";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { ProductDetailClient } from "./product-detail-client";

interface Props {
  params: { slug: string };
}

/** Cached so generateMetadata and the page body share one DB hit per request. */
const getProduct = cache(async (slug: string) => {
  return prisma.product
    .findUnique({
      where: { slug },
      select: {
        name: true,
        tagline: true,
        description: true,
        logoUrl: true,
        websiteUrl: true,
        status: true,
        launchDate: true,
        category: { select: { name: true } },
        maker: { select: { name: true } },
      },
    })
    .catch(() => null); // DB down → fall back to slug-derived title
});

/** Real title/description for search results and social shares. The page body
 * stays client-fetched; this runs server-side only for metadata. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.slug);

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

export default async function ProductDetailPage({ params }: Props) {
  const product = await getProduct(params.slug);
  const siteUrl = process.env.NEXTAUTH_URL ?? "https://denveler.com";

  const jsonLd =
    product && product.status === "LIVE"
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.description,
          category: product.category.name,
          releaseDate: product.launchDate.toISOString(),
          url: `${siteUrl}/products/${params.slug}`,
          ...(product.logoUrl ? { image: product.logoUrl } : {}),
          ...(product.websiteUrl ? { sameAs: product.websiteUrl } : {}),
          brand: { "@type": "Organization", name: product.maker.name },
        }
      : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          // Escape "<" so a maker-controlled name/description containing
          // "</script>" can't break out of this tag and inject real markup.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      )}
      <ProductDetailClient slug={params.slug} />
    </>
  );
}
