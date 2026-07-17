export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";

/** GET /api/me/sent-contact-requests — solicitudes de contacto que YO envié como comprador. */
export const GET = withErrorHandling(async () => {
  const user = await requireUser();

  const requests = await prisma.contactRequest.findMany({
    where: { buyerId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      message: true,
      status: true,
      createdAt: true,
      buyer: { select: { name: true } },
      product: { select: { name: true, slug: true } },
    },
  });

  return ok(requests);
});
