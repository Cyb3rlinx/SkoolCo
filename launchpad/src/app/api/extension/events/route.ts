export const dynamic = "force-dynamic";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { extensionEventSchema } from "@/lib/validation";
import { withErrorHandling, parseBody, created, errorResponse } from "@/lib/api";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * POST /api/extension/events
 * Minimal, first-party-only audit trail of explicit extension actions
 * (e.g. "user clicked Save on a link"). Events are tied to the signed-in
 * platform account, contain no Skool data beyond what the user submitted,
 * and are only writable by the user themselves. This exists for abuse
 * detection and debugging — not tracking.
 */
export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser();

  if (!(await checkRateLimit(`ext-event:${user.id}`, RATE_LIMITS.extensionEvent))) {
    return errorResponse(429, "Too many events");
  }

  const input = await parseBody(req, extensionEventSchema);

  const event = await prisma.extensionEvent.create({
    data: {
      userId: user.id,
      eventType: input.eventType,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
    select: { id: true, eventType: true, createdAt: true },
  });

  return created(event);
});
