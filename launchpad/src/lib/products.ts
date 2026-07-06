import { prisma } from "@/lib/db";
import { slugify } from "@/lib/validation";
import { ApiError } from "@/lib/auth";

/** Generate a slug from a product name, appending -2, -3, … on collision. */
export async function uniqueProductSlug(name: string): Promise<string> {
  const base = slugify(name) || "product";
  let slug = base;
  let n = 2;
  // Bounded loop; collisions beyond a handful are practically impossible.
  while (await prisma.product.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${n++}`;
    if (n > 50) {
      slug = `${base}-${Date.now().toString(36)}`;
      break;
    }
  }
  return slug;
}

export const productListSelect = {
  id: true,
  name: true,
  slug: true,
  tagline: true,
  logoUrl: true,
  websiteUrl: true,
  launchDate: true,
  status: true,
  createdAt: true,
  category: { select: { id: true, name: true, slug: true } },
  maker: { select: { id: true, name: true, avatarUrl: true } },
  _count: { select: { upvotes: true, comments: true } },
} as const;

/** Resolve a product by slug or id (routes accept either). 404s if missing. */
export async function findProduct(slugOrId: string) {
  const product = await prisma.product.findFirst({
    where: { OR: [{ slug: slugOrId }, { id: slugOrId }] },
    select: { id: true, slug: true, makerId: true, status: true },
  });
  if (!product) throw new ApiError(404, "Product not found");
  return product;
}
