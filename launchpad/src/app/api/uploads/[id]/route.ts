export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

type Params = { params: { id: string } };

/**
 * GET /api/uploads/:id — serve an uploaded image (public).
 * Uploads are immutable (re-uploading creates a new id), so the response is
 * cacheable forever. `nosniff` + sniffed mime keep content-type honest.
 */
export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const image = await prisma.uploadedImage.findUnique({
    where: { id: params.id },
    select: { data: true, mime: true },
  });
  if (!image) throw new ApiError(404, "Image not found");

  return new NextResponse(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mime,
      "Content-Length": String(image.data.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
