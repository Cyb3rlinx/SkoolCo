export const dynamic = "force-dynamic";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { sendContactSharedNotification } from "@/lib/offer-emails";
import { withErrorHandling, parseBody, ok } from "@/lib/api";

const resolveSchema = z.object({ status: z.enum(["SHARED", "DISMISSED"]) });

/**
 * PATCH /api/contact-requests/:id — el maker del producto comparte su email
 * (SHARED → se le envía al comprador) o descarta la solicitud (DISMISSED).
 */
export const PATCH = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser();
    const { status } = await parseBody(req, resolveSchema);

    const request = await prisma.contactRequest.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        buyer: { select: { name: true, email: true } },
        product: { select: { name: true, makerId: true, maker: { select: { name: true, email: true } } } },
      },
    });
    if (!request || request.product.makerId !== user.id) {
      throw new ApiError(404, "Solicitud no encontrada.");
    }
    if (request.status !== "PENDING") {
      throw new ApiError(400, "Esta solicitud ya fue resuelta.");
    }

    const updated = await prisma.contactRequest.update({
      where: { id: request.id },
      data: { status },
      select: { id: true, status: true },
    });

    if (status === "SHARED") {
      try {
        await sendContactSharedNotification({
          buyerEmail: request.buyer.email,
          buyerName: request.buyer.name,
          makerName: request.product.maker.name,
          makerEmail: request.product.maker.email,
          productName: request.product.name,
        });
      } catch (err) {
        console.error("[contact-request] email al comprador falló:", err);
      }
    }

    return ok(updated);
  }
);
