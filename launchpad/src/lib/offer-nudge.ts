/**
 * Selección de candidatos para el email de tracción ("tu producto genera
 * interés — puedes activar Abierto a ofertas"). Función pura: la consulta
 * a la base y el envío viven en el endpoint del cron.
 */

export const OFFER_NUDGE_UPVOTE_THRESHOLD = 10;

export interface OfferNudgeProduct {
  status: string;
  openToOffers: boolean;
  offerNudgeSentAt: Date | null;
  upvoteCount: number;
}

/** Filtra los productos que califican para recibir el aviso (una sola vez). */
export function selectOfferNudgeCandidates<T extends OfferNudgeProduct>(products: T[]): T[] {
  return products.filter(
    (p) =>
      p.status === "LIVE" &&
      !p.openToOffers &&
      p.offerNudgeSentAt === null &&
      p.upvoteCount >= OFFER_NUDGE_UPVOTE_THRESHOLD
  );
}
