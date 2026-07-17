import { prisma } from "@/lib/db";

/** Pure: ¿corresponde otorgar "Fundador"? `count` incluye al maker que se está evaluando. */
export function shouldGrantFundador(liveMakerCountIncludingThis: number): boolean {
  return liveMakerCountIncludingThis <= 10;
}

/** Pure: ¿corresponde otorgar "Primer lanzamiento"? `count` incluye el producto que se está evaluando. */
export function shouldGrantPrimerLanzamiento(makerLiveProductCountIncludingThis: number): boolean {
  return makerLiveProductCountIncludingThis === 1;
}

/**
 * Otorga una insignia si el usuario todavía no la tiene. Idempotente gracias
 * al `@@unique([userId, badgeId])` — un intento duplicado no explota, se ignora.
 */
export async function grantBadgeIfMissing(
  userId: string,
  badgeSlug: string,
  grantedById: string | null
): Promise<void> {
  const badge = await prisma.badge.findUnique({ where: { slug: badgeSlug }, select: { id: true } });
  if (!badge) {
    console.error(`[badges] slug desconocido: ${badgeSlug}`);
    return;
  }
  const existing = await prisma.userBadge.findUnique({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
    select: { id: true },
  });
  if (existing) return;
  await prisma.userBadge.create({ data: { userId, badgeId: badge.id, grantedById } });
}
