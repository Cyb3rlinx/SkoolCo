/**
 * Backfill de `username` para usuarios creados antes de este feature.
 * NO es SQL a mano — corre una sola vez, local o contra producción, apuntando
 * DATABASE_URL a la base correspondiente:
 *
 *   DATABASE_URL="postgres://...prod..." npx tsx prisma/backfill-usernames.ts
 *
 * Idempotente: solo toca usuarios con username NULL, así que correrlo dos
 * veces no hace nada la segunda vez.
 */
import { PrismaClient } from "@prisma/client";
import { baseUsername, resolveUsername } from "../src/lib/username";

const prisma = new PrismaClient();

async function main() {
  const withUsername = await prisma.user.findMany({
    where: { username: { not: null } },
    select: { username: true },
  });
  const taken = new Set(withUsername.map((u) => u.username as string));

  const pending = await prisma.user.findMany({
    where: { username: null },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`[backfill-usernames] ${pending.length} usuario(s) sin username.`);

  for (const user of pending) {
    const base = baseUsername(user.name);
    const username = resolveUsername(base, taken);
    taken.add(username);
    await prisma.user.update({ where: { id: user.id }, data: { username } });
    console.log(`[backfill-usernames] ${user.id} -> ${username}`);
  }

  console.log("[backfill-usernames] listo.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
