export const dynamic = "force-dynamic";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { createCollaborationContactRequestSchema } from "@/lib/validation";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { sendCollaborationContactRequestNotification } from "@/lib/collaboration-emails";
import { withErrorHandling, parseBody, created, errorResponse } from "@/lib/api";

/**
 * POST /api/collaborations/:id/contact-requests — pedir contacto al autor
 * de un anuncio. 1 por usuario por anuncio (unique en DB).
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser();

    if (
      !(await checkRateLimit(
        `collaborationContact:${user.id}`,
        RATE_LIMITS.collaborationContactRequest
      ))
    ) {
      return errorResponse(429, "Demasiadas solicitudes por hoy. Intenta mañana.");
    }

    const collaboration = await prisma.collaboration.findUnique({
      where: { id: params.id },
      select: { id: true, title: true, authorId: true, author: { select: { name: true, email: true } } },
    });
    if (!collaboration) throw new ApiError(404, "Colaboración no encontrada.");

    if (collaboration.authorId === user.id) {
      throw new ApiError(400, "No puedes solicitar contacto por tu propio anuncio.");
    }

    const { message } = await parseBody(req, createCollaborationContactRequestSchema);

    let request;
    try {
      request = await prisma.collaborationContactRequest.create({
        data: { collaborationId: collaboration.id, responderId: user.id, message },
        select: { id: true, status: true, createdAt: true },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ApiError(409, "Ya solicitaste contacto por esta colaboración.");
      }
      throw err;
    }

    try {
      await sendCollaborationContactRequestNotification({
        authorEmail: collaboration.author.email,
        authorName: collaboration.author.name,
        responderName: user.name,
        collaborationTitle: collaboration.title,
        message,
        baseUrl: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
      });
    } catch (err) {
      console.error("[collaboration-contact-request] email al autor falló:", err);
    }

    return created(request);
  }
);
