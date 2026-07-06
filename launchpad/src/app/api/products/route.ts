import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser, requireUser } from "@/lib/auth";
import { createProductSchema, listProductsQuerySchema } from "@/lib/validation";
import { uniqueProductSlug, productListSelect } from "@/lib/products";
import { withErrorHandling, parseBody, ok, created, errorResponse } from "@/lib/api";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * GET /api/products
 * Query: status? category? (slug) q? (search) sort? (newest|top|launching) page? pageSize?
 *
 * Anonymous users only ever see LIVE products. Signed-in users may pass
 * status filters, but non-LIVE results are restricted to their own products
 * (moderators/admins see everything).
 */
export const GET = withErrorHandling(async (req: Request) => {
  const url = new URL(req.url);
  const query = listProductsQuerySchema.parse(Object.fromEntries(url.searchParams));
  const user = await getSessionUser();
  const isStaff = user && (user.role === "ADMIN" || user.role === "MODERATOR");

  const where: Prisma.ProductWhereInput = {};

  if (!query.status || query.status === "LIVE") {
    where.status = "LIVE";
  } else if (isStaff) {
    where.status = query.status;
  } else if (user) {
    where.status = query.status;
    where.makerId = user.id; // only your own drafts/scheduled/archived
  } else {
    return errorResponse(401, "Sign in to view non-live products");
  }

  if (query.category) {
    where.category = { slug: query.category };
  }

  if (query.q) {
    // MVP search: case-insensitive substring match. Move to Postgres
    // full-text (tsvector) only if catalog size ever makes this slow.
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { tagline: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    query.sort === "top"
      ? { upvotes: { _count: "desc" } }
      : query.sort === "launching"
        ? { launchDate: "asc" }
        : { launchDate: "desc" };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      select: productListSelect,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return ok({
    items,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.ceil(total / query.pageSize),
  });
});

/**
 * POST /api/products — submit a launch (auth required).
 * Body: { name, tagline, description, categoryId, launchDate, websiteUrl?, logoUrl?, status? }
 */
export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser();

  if (!checkRateLimit(`product:${user.id}`, RATE_LIMITS.productCreate)) {
    return errorResponse(429, "You're submitting too fast. Try again later.");
  }

  const input = await parseBody(req, createProductSchema);

  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true },
  });
  if (!category) return errorResponse(400, "Unknown category");

  const slug = await uniqueProductSlug(input.name);

  const product = await prisma.product.create({
    data: {
      makerId: user.id,
      name: input.name,
      slug,
      tagline: input.tagline,
      description: input.description,
      websiteUrl: input.websiteUrl ?? null,
      logoUrl: input.logoUrl ?? null,
      categoryId: input.categoryId,
      launchDate: input.launchDate,
      status: input.status,
    },
    select: { ...productListSelect, description: true },
  });

  return created(product);
});
