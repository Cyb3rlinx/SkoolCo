export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { validateImageUpload, MAX_IMAGE_BYTES } from "@/lib/uploads";
import { withErrorHandling, created } from "@/lib/api";

/**
 * POST /api/uploads — upload an image (multipart/form-data, field `file`).
 * Auth required. Validates declared mime, size cap and magic bytes; stores
 * the image in Postgres and returns its public URL (`/api/uploads/:id`).
 */
export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser();

  if (!(await checkRateLimit(`upload:${user.id}`, RATE_LIMITS.upload))) {
    throw new ApiError(429, "Too many uploads. Try again later.");
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError(400, "Expected multipart/form-data with a 'file' field");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new ApiError(400, "Missing 'file' field");
  }
  // Cheap reject before buffering the body into memory.
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ApiError(400, "Image too large (max 2MB)");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = validateImageUpload(bytes, file.type);
  if (!check.ok) throw new ApiError(400, check.error);

  const image = await prisma.uploadedImage.create({
    data: {
      uploaderId: user.id,
      mime: check.mime,
      size: bytes.byteLength,
      data: Buffer.from(bytes),
    },
    select: { id: true },
  });

  return created({ id: image.id, url: `/api/uploads/${image.id}` });
});
