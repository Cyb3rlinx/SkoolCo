export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { createContactRequestSchema } from "@/lib/validation";
import { findProduct } from "@/lib/products";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { sendContactRequestNotification } from "@/lib/offer-emails";
import { withErrorHandling, parseBody, created } from "@/lib/api";

/**
 * POST /api/products/:slug/contact-requests — un comprador registrado pide
 * el contacto del maker de un producto abierto a ofertas. 1 por comprador
 * por producto (unique en DB). El maker recibe un email y decide en /profile.
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: { params: { slug: string } }) => {
    const user = await requireUser();

    if (!(await checkRateLimit(`contactRequest:${user.id}`, RATE_LIMITS.contactRequest))) {
      throw new ApiError(429, "Demasiadas solicitudes por hoy. Intenta mañana.");
    }

    const base = await findProduct(params.slug);
    if (base.status !== "LIVE" && base.makerId !== user.id) {
      throw new ApiError(404, "Product not found");
    }

    if (base.makerId === user.id) {
      throw new ApiError(400, "No puedes solicitar contacto por tu propio producto.");
    }

    const product = await prisma.product.findUniqueOrThrow({
      where: { id: base.id },
      select: {
        name: true,
        status: true,
        openToOffers: true,
        maker: { select: { name: true, email: true } },
      },
    });
    if (product.status !== "LIVE" || !product.openToOffers) {
      throw new ApiError(400, "Este producto no está abierto a ofertas.");
    }

    const { message } = await parseBody(req, createContactRequestSchema);

    let request;
    try {
      request = await prisma.contactRequest.create({
        data: { productId: base.id, buyerId: user.id, message },
        select: { id: true, status: true, createdAt: true },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ApiError(409, "Ya solicitaste contacto por este producto.");
      }
      throw err;
    }

    // El email no debe tumbar la solicitud si el proveedor falla.
    try {
      await sendContactRequestNotification({
        makerEmail: product.maker.email,
        makerName: product.maker.name,
        buyerName: user.name,
        productName: product.name,
        message,
        baseUrl: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
      });
    } catch (err) {
      console.error("[contact-request] email al maker falló:", err);
    }

    return created(request);
  }
);
