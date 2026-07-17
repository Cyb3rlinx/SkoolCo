export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";

/** GET /api/me/sent-collaboration-contact-requests — solicitudes que YO envié. */
export const GET = withErrorHandling(async () => {
  const user = await requireUser();

  const requests = await prisma.collaborationContactRequest.findMany({
    where: { responderId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      message: true,
      status: true,
      createdAt: true,
      collaboration: { select: { id: true, title: true } },
    },
  });

  return ok(requests);
});
