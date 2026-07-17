export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { getSessionUser, requireUser, ApiError } from "@/lib/auth";
import { updateProductSchema } from "@/lib/validation";
import { productListSelect, findProduct } from "@/lib/products";
import { withErrorHandling, parseBody, ok, noContent } from "@/lib/api";

type Params = { params: { slug: string } };

const detailSelect = {
  ...productListSelect,
  description: true,
  updatedAt: true,
  openToOffers: true,
  declaredMrrUsd: true,
  monetizationNote: true,
  offerViewCount: true,
  mrrVerifiedAt: true,
  images: {
    select: { id: true, url: true, sort: true },
    orderBy: { sort: "asc" as const },
  },
} as const;

/**
 * GET /api/products/:slug — product detail.
 * Non-live products are visible only to their maker and staff.
 */
export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const base = await findProduct(params.slug);
  const user = await getSessionUser();
  const isStaff = user && (user.role === "ADMIN" || user.role === "MODERATOR");

  if (base.status !== "LIVE" && !isStaff && user?.id !== base.makerId) {
    throw new ApiError(404, "Product not found");
  }

  const product = await prisma.product.findUniqueOrThrow({
    where: { id: base.id },
    select: detailSelect,
  });

  const upvotedByMe = user
    ? Boolean(
        await prisma.upvote.findUnique({
          where: { userId_productId: { userId: user.id, productId: base.id } },
          select: { id: true },
        })
      )
    : false;

  // Señal del puente: una vista de la oferta por cada carga de un no-maker.
  // Efecto secundario: si falla, no tumba la respuesta.
  if (product.openToOffers && user?.id !== base.makerId) {
    try {
      await prisma.product.update({
        where: { id: base.id },
        data: { offerViewCount: { increment: 1 } },
      });
    } catch (err) {
      console.error("[offer-views] no se pudo incrementar:", err);
    }
  }

  return ok({ ...product, upvotedByMe });
});

/** PATCH /api/products/:slug — update (maker or staff only). */
export const PATCH = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const base = await findProduct(params.slug);
  const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";

  if (base.makerId !== user.id && !isStaff) {
    throw new ApiError(403, "You can only edit your own products");
  }

  const input = await parseBody(req, updateProductSchema);

  if (input.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
      select: { id: true },
    });
    if (!category) throw new ApiError(400, "Unknown category");
  }

  const product = await prisma.product.update({
    where: { id: base.id },
    data: input,
    select: detailSelect,
  });

  return ok(product);
});

/** DELETE /api/products/:slug — archive (soft delete). Maker or staff. */
export const DELETE = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const base = await findProduct(params.slug);
  const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";

  if (base.makerId !== user.id && !isStaff) {
    throw new ApiError(403, "You can only archive your own products");
  }

  await prisma.product.update({
    where: { id: base.id },
    data: { status: "ARCHIVED" },
  });

  return noContent();
});
