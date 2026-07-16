export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { requireAdmin, ApiError } from "@/lib/auth";
import { adminUpdateUserSchema } from "@/lib/validation";
import { withErrorHandling, parseBody, ok, noContent } from "@/lib/api";

type Params = { params: { id: string } };

/**
 * Reglas compartidas de protección:
 * - Nadie se modifica/borra a sí mismo.
 * - No dejar la plataforma sin ADMINs activos: si el objetivo es un ADMIN sin
 *   suspender y es el único, se rechaza toda operación que lo quite (bajar rol,
 *   suspender o borrar).
 */
async function loadTarget(id: string, selfId: string) {
  if (id === selfId) {
    throw new ApiError(400, "No puedes modificar tu propia cuenta.");
  }
  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, suspendedAt: true },
  });
  if (!target) throw new ApiError(404, "Usuario no encontrado");
  return target;
}

async function assertNotLastActiveAdmin(target: { role: string; suspendedAt: Date | null }) {
  if (target.role !== "ADMIN" || target.suspendedAt !== null) return;
  const activeAdmins = await prisma.user.count({
    where: { role: "ADMIN", suspendedAt: null },
  });
  if (activeAdmins <= 1) {
    throw new ApiError(400, "No puedes quitar al último administrador activo.");
  }
}

/** PATCH /api/admin/users/:id — cambia rol y/o suspensión (solo ADMIN). */
export const PATCH = withErrorHandling(async (req: Request, { params }: Params) => {
  const admin = await requireAdmin();
  const target = await loadTarget(params.id, admin.id);
  const input = await parseBody(req, adminUpdateUserSchema);

  const demotes = input.role !== undefined && input.role !== "ADMIN";
  const suspends = input.suspended === true;
  if (demotes || suspends) {
    await assertNotLastActiveAdmin(target);
  }

  const user = await prisma.user.update({
    where: { id: target.id },
    data: {
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.suspended !== undefined
        ? { suspendedAt: input.suspended ? new Date() : null }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      suspendedAt: true,
    },
  });

  return ok(user);
});

/** DELETE /api/admin/users/:id — borra la cuenta y su contenido (solo ADMIN). */
export const DELETE = withErrorHandling(async (_req: Request, { params }: Params) => {
  const admin = await requireAdmin();
  const target = await loadTarget(params.id, admin.id);
  await assertNotLastActiveAdmin(target);

  await prisma.user.delete({ where: { id: target.id } });
  return noContent();
});
