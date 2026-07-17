import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

const STATIC_ROUTES = [
  "",
  "/launches",
  "/leaderboard",
  "/extension",
  "/acerca",
  "/contacto",
  "/normas",
  "/ayuda",
  "/guias",
  "/novedades",
  "/privacidad",
  "/terminos",
  "/colaboraciones",
];

/**
 * Sitemap dinámico: rutas estáticas + todos los productos LIVE + perfiles de
 * makers con al menos un lanzamiento LIVE. Se regenera en cada build/request
 * (force-dynamic implícito por usar Prisma).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXTAUTH_URL ?? "https://denveler.com";

  const [products, makers, collaborations] = await Promise.all([
    prisma.product.findMany({
      where: { status: "LIVE" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.user.findMany({
      where: { products: { some: { status: "LIVE" } } },
      select: { id: true },
    }),
    prisma.collaboration.findMany({
      select: { id: true, updatedAt: true },
    }),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: path === "" || path === "/launches" ? "hourly" : "weekly",
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${siteUrl}/products/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "daily",
  }));

  const makerEntries: MetadataRoute.Sitemap = makers.map((m) => ({
    url: `${siteUrl}/makers/${m.id}`,
    changeFrequency: "weekly",
  }));

  const collaborationEntries: MetadataRoute.Sitemap = collaborations.map((c) => ({
    url: `${siteUrl}/colaboraciones/${c.id}`,
    lastModified: c.updatedAt,
    changeFrequency: "daily",
  }));

  return [...staticEntries, ...productEntries, ...makerEntries, ...collaborationEntries];
}
