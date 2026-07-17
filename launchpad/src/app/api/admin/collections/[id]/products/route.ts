export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { requireAdmin, ApiError } from "@/lib/auth";
import { addCollectionProductSchema } from "@/lib/validation";
import { withErrorHandling, parseBody, created, noContent } from "@/lib/api";

type Params = { params: { id: string } };

/** POST /api/admin/collections/:id/products — agrega un producto (solo ADMIN). */
export const POST = withErrorHandling(async (req: Request, { params }: Params) => {
  await requireAdmin();
  const collection = await prisma.collection.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!collection) throw new ApiError(404, "Colección no encontrada");

  const input = await parseBody(req, addCollectionProductSchema);
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true },
  });
  if (!product) throw new ApiError(404, "Producto no encontrado");

  const existing = await prisma.collectionProduct.findUnique({
    where: { collectionId_productId: { collectionId: collection.id, productId: product.id } },
    select: { id: true },
  });
  if (existing) throw new ApiError(400, "Ese producto ya está en la colección");

  const maxSort = await prisma.collectionProduct.aggregate({
    where: { collectionId: collection.id },
    _max: { sort: true },
  });

  const entry = await prisma.collectionProduct.create({
    data: {
      collectionId: collection.id,
      productId: product.id,
      sort: (maxSort._max.sort ?? -1) + 1,
    },
    select: { id: true, productId: true },
  });

  return created(entry);
});

/** DELETE /api/admin/collections/:id/products?productId=xxx — quita un producto (solo ADMIN). */
export const DELETE = withErrorHandling(async (req: Request, { params }: Params) => {
  await requireAdmin();
  const url = new URL(req.url);
  const productId = url.searchParams.get("productId");
  if (!productId) throw new ApiError(400, "Falta el parámetro productId");

  await prisma.collectionProduct.deleteMany({
    where: { collectionId: params.id, productId },
  });

  return noContent();
});
