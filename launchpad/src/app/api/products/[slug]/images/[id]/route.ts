export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { findProduct } from "@/lib/products";
import { withErrorHandling, noContent } from "@/lib/api";

/** DELETE /api/products/:slug/images/:id — remove a gallery screenshot (maker/staff). */
export const DELETE = withErrorHandling(
  async (_req: Request, { params }: { params: { slug: string; id: string } }) => {
    const user = await requireUser();
    const base = await findProduct(params.slug);
    const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";

    if (base.makerId !== user.id && !isStaff) {
      throw new ApiError(403, "You can only edit your own products");
    }

    const image = await prisma.productImage.findUnique({
      where: { id: params.id },
      select: { id: true, productId: true },
    });
    if (!image || image.productId !== base.id) {
      throw new ApiError(404, "Image not found");
    }

    await prisma.productImage.delete({ where: { id: image.id } });
    return noContent();
  }
);
