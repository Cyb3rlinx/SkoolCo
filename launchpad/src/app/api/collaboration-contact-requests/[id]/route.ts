export const dynamic = "force-dynamic";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { sendCollaborationContactSharedNotification } from "@/lib/collaboration-emails";
import { withErrorHandling, parseBody, ok } from "@/lib/api";

const resolveSchema = z.object({ status: z.enum(["SHARED", "DISMISSED"]) });

/**
 * PATCH /api/collaboration-contact-requests/:id — el autor del anuncio
 * comparte su email (SHARED) o descarta la solicitud (DISMISSED).
 */
export const PATCH = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser();
    const { status } = await parseBody(req, resolveSchema);

    const request = await prisma.collaborationContactRequest.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        responder: { select: { name: true, email: true } },
        collaboration: {
          select: { title: true, authorId: true, author: { select: { name: true, email: true } } },
        },
      },
    });
    if (!request || request.collaboration.authorId !== user.id) {
      throw new ApiError(404, "Solicitud no encontrada.");
    }
    if (request.status !== "PENDING") {
      throw new ApiError(400, "Esta solicitud ya fue resuelta.");
    }

    const updated = await prisma.collaborationContactRequest.update({
      where: { id: request.id },
      data: { status },
      select: { id: true, status: true },
    });

    if (status === "SHARED") {
      try {
        await sendCollaborationContactSharedNotification({
          responderEmail: request.responder.email,
          responderName: request.responder.name,
          authorName: request.collaboration.author.name,
          authorEmail: request.collaboration.author.email,
          collaborationTitle: request.collaboration.title,
        });
      } catch (err) {
        console.error("[collaboration-contact-request] email al responder falló:", err);
      }
    }

    return ok(updated);
  }
);
