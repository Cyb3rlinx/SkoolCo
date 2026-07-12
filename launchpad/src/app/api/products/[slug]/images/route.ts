export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { addProductImageSchema, MAX_PRODUCT_IMAGES } from "@/lib/validation";
import { findProduct } from "@/lib/products";
import { withErrorHandling, parseBody, created } from "@/lib/api";

/**
 * POST /api/products/:slug/images — add a gallery screenshot (maker/staff).
 * Body: { url } — a public https URL or an uploaded image (/api/uploads/:id).
 */
export const POST = withErrorHandling(async (req: Request, { params }: { params: { slug: string } }) => {
  const user = await requireUser();
  const base = await findProduct(params.slug);
  const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";

  if (base.makerId !== user.id && !isStaff) {
    throw new ApiError(403, "You can only edit your own products");
  }

  const { url } = await parseBody(req, addProductImageSchema);

  const count = await prisma.productImage.count({ where: { productId: base.id } });
  if (count >= MAX_PRODUCT_IMAGES) {
    throw new ApiError(400, `Maximum ${MAX_PRODUCT_IMAGES} gallery images per product`);
  }

  const image = await prisma.productImage.create({
    data: { productId: base.id, url, sort: count },
    select: { id: true, url: true, sort: true },
  });

  return created(image);
});
