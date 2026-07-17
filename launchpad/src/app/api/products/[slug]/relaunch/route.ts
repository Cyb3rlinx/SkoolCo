export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { withErrorHandling, created, errorResponse } from "@/lib/api";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { findProduct, uniqueProductSlug, productListSelect } from "@/lib/products";

type Params = { params: { slug: string } };

/**
 * POST /api/products/:idOrSlug/relaunch — clone an archived product into a
 * fresh DRAFT (new slug, no votes/comments carried over). Maker or staff only.
 */
export const POST = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();

  if (!(await checkRateLimit(`relaunch:${user.id}`, RATE_LIMITS.productCreate))) {
    return errorResponse(429, "Too many launches created recently. Try again later.");
  }

  const source = await findProduct(params.slug);
  const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";

  if (source.makerId !== user.id && !isStaff) {
    throw new ApiError(403, "You can only relaunch your own products");
  }
  if (source.status !== "ARCHIVED") {
    throw new ApiError(400, "Only archived products can be relaunched");
  }

  const full = await prisma.product.findUniqueOrThrow({
    where: { id: source.id },
    select: {
      name: true,
      tagline: true,
      description: true,
      websiteUrl: true,
      logoUrl: true,
      categoryId: true,
    },
  });

  const slug = await uniqueProductSlug(full.name);

  const relaunch = await prisma.product.create({
    data: {
      makerId: source.makerId,
      name: full.name,
      slug,
      tagline: full.tagline,
      description: full.description,
      websiteUrl: full.websiteUrl,
      logoUrl: full.logoUrl,
      categoryId: full.categoryId,
      launchDate: new Date(),
      status: "DRAFT",
    },
    select: { ...productListSelect, description: true },
  });

  return created(relaunch);
});
