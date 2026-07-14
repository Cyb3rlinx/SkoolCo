export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";
import { selectOfferNudgeCandidates } from "@/lib/offer-nudge";
import { sendOfferNudgeEmail } from "@/lib/offer-emails";

/**
 * GET /api/cron/offer-nudge — corre a diario vía Vercel Cron. Busca productos
 * LIVE con tracción (umbral en offer-nudge.ts) que aún no activaron "Abierto a
 * ofertas" ni recibieron este aviso, y les envía UN email (offerNudgeSentAt
 * como candado). Protegido con CRON_SECRET (Vercel lo manda como Bearer);
 * sin CRON_SECRET configurado (dev local) no exige auth, igual que el modo
 * solo-log de sendEmail sin RESEND_API_KEY.
 */
export const GET = withErrorHandling(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    throw new ApiError(401, "Unauthorized");
  }

  const products = await prisma.product.findMany({
    where: { status: "LIVE", openToOffers: false, offerNudgeSentAt: null },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      openToOffers: true,
      offerNudgeSentAt: true,
      _count: { select: { upvotes: true } },
      maker: { select: { name: true, email: true } },
    },
  });

  const candidates = selectOfferNudgeCandidates(
    products.map((p) => ({ ...p, upvoteCount: p._count.upvotes }))
  );

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  let sent = 0;
  for (const p of candidates) {
    // Un email fallido no debe frenar el resto del lote.
    try {
      await sendOfferNudgeEmail({
        makerEmail: p.maker.email,
        makerName: p.maker.name,
        productName: p.name,
        upvoteCount: p.upvoteCount,
        productUrl: `${baseUrl}/products/${p.slug}`,
      });
      await prisma.product.update({
        where: { id: p.id },
        data: { offerNudgeSentAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error(`[offer-nudge] aviso para ${p.slug} falló:`, err);
    }
  }

  return ok({ checked: products.length, sent });
});
