/**
 * Selección de colaboraciones a borrar (más de 35 días de antigüedad).
 * Función pura: la consulta a la base y el borrado viven en el endpoint del
 * cron. Mismo patrón que src/lib/offer-nudge.ts.
 */

export const COLLABORATION_MAX_AGE_DAYS = 35;

export interface ExpirableCollaboration {
  createdAt: Date;
}

/** Filtra las colaboraciones con más de COLLABORATION_MAX_AGE_DAYS de antigüedad. */
export function selectExpiredCollaborations<T extends ExpirableCollaboration>(
  collaborations: T[],
  now: Date
): T[] {
  const cutoff = now.getTime() - COLLABORATION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  return collaborations.filter((c) => c.createdAt.getTime() <= cutoff);
}
