export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";
import { productListSelect } from "@/lib/products";

type Params = { params: { slug: string } };

/** GET /api/collections/:slug — detalle público con sus productos. */
export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const collection = await prisma.collection.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      createdAt: true,
      items: {
        orderBy: { sort: "asc" },
        select: { product: { select: productListSelect } },
      },
    },
  });
  if (!collection) throw new ApiError(404, "Colección no encontrada");

  return ok({
    id: collection.id,
    title: collection.title,
    slug: collection.slug,
    description: collection.description,
    createdAt: collection.createdAt,
    products: collection.items.map((i) => i.product),
  });
});
