export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireModerator, ApiError } from "@/lib/auth";
import { resolveReportSchema } from "@/lib/validation";
import { withErrorHandling, parseBody, ok } from "@/lib/api";

type Params = { params: { id: string } };

/**
 * PATCH /api/reports/:id — update report status (moderator/admin only).
 * Body: { status: "REVIEWING" | "RESOLVED" | "DISMISSED" }
 */
export const PATCH = withErrorHandling(async (req: Request, { params }: Params) => {
  const moderator = await requireModerator();
  const input = await parseBody(req, resolveReportSchema);

  const existing = await prisma.moderationReport.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!existing) throw new ApiError(404, "Report not found");

  const terminal = input.status === "RESOLVED" || input.status === "DISMISSED";
  const report = await prisma.moderationReport.update({
    where: { id: params.id },
    data: {
      status: input.status,
      resolvedById: terminal ? moderator.id : null,
      resolvedAt: terminal ? new Date() : null,
    },
    select: { id: true, status: true, resolvedById: true, resolvedAt: true },
  });

  return ok(report);
});
