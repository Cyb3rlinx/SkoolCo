export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { getSessionUser, ApiError } from "@/lib/auth";
import { collaborationSelect } from "@/lib/collaborations";
import { withErrorHandling, ok, noContent } from "@/lib/api";

/** GET /api/collaborations/:id — detalle público. */
export const GET = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const collaboration = await prisma.collaboration.findUnique({
      where: { id: params.id },
      select: collaborationSelect,
    });
    if (!collaboration) throw new ApiError(404, "Colaboración no encontrada.");
    return ok(collaboration);
  }
);

/** DELETE /api/collaborations/:id — el autor o un admin/moderador la borran. */
export const DELETE = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "Authentication required");

    const collaboration = await prisma.collaboration.findUnique({
      where: { id: params.id },
      select: { id: true, authorId: true },
    });
    if (!collaboration) throw new ApiError(404, "Colaboración no encontrada.");

    const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";
    if (collaboration.authorId !== user.id && !isStaff) {
      throw new ApiError(403, "No puedes borrar esta colaboración.");
    }

    await prisma.collaboration.delete({ where: { id: collaboration.id } });
    return noContent();
  }
);
