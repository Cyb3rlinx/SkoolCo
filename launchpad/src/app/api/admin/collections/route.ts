export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createCollectionSchema, slugify } from "@/lib/validation";
import { withErrorHandling, parseBody, created } from "@/lib/api";

async function uniqueCollectionSlug(title: string): Promise<string> {
  const base = slugify(title) || "coleccion";
  let slug = base;
  let n = 2;
  while (await prisma.collection.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${n++}`;
    if (n > 50) {
      slug = `${base}-${Date.now().toString(36)}`;
      break;
    }
  }
  return slug;
}

/** POST /api/admin/collections — crear una colección curada (solo ADMIN). */
export const POST = withErrorHandling(async (req: Request) => {
  const admin = await requireAdmin();
  const input = await parseBody(req, createCollectionSchema);
  const slug = await uniqueCollectionSlug(input.title);

  const collection = await prisma.collection.create({
    data: {
      title: input.title,
      description: input.description,
      slug,
      createdById: admin.id,
    },
    select: { id: true, title: true, slug: true, description: true, createdAt: true },
  });

  return created(collection);
});
