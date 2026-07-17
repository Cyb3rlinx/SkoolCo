export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { createProductUpdateSchema } from "@/lib/validation";
import { withErrorHandling, parseBody, ok, created, errorResponse } from "@/lib/api";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { findProduct } from "@/lib/products";

type Params = { params: { slug: string } };

const updateSelect = { id: true, body: true, createdAt: true } as const;

/** GET /api/products/:idOrSlug/updates — bitácora pública, más reciente primero. */
export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const product = await findProduct(params.slug);

  const updates = await prisma.productUpdate.findMany({
    where: { productId: product.id },
    orderBy: { createdAt: "desc" },
    select: updateSelect,
  });

  return ok(updates);
});

/** POST /api/products/:idOrSlug/updates — publicar un update (solo el maker dueño o staff). */
export const POST = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const product = await findProduct(params.slug);
  const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";

  if (product.makerId !== user.id && !isStaff) {
    throw new ApiError(403, "Solo el maker dueño puede publicar en la bitácora");
  }

  if (!(await checkRateLimit(`product-update:${user.id}`, RATE_LIMITS.productUpdate))) {
    return errorResponse(429, "Estás publicando demasiado rápido. Espera un poco.");
  }

  const input = await parseBody(req, createProductUpdateSchema);

  const update = await prisma.productUpdate.create({
    data: { productId: product.id, body: input.body },
    select: updateSelect,
  });

  return created(update);
});
