export const dynamic = "force-dynamic";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, requireModerator } from "@/lib/auth";
import { createCommunityLinkSchema } from "@/lib/validation";
import { detectPlatform } from "@/lib/platforms";
import { withErrorHandling, parseBody, ok, created, errorResponse } from "@/lib/api";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * Community links — backend support for the "Logros" browser extension.
 *
 * Safety model (deliberate constraints):
 * 1. Submissions require a signed-in platform user and an explicit action
 *    (a click in the extension popup). There is no background capture.
 * 2. The backend never talks to the source platforms (Skool, Discord,
 *    YouTube, etc. — see src/lib/platforms.ts). It stores only a title +
 *    public URL the user chose to share. No scraping, no session cookies,
 *    no third-party credentials — the schema has no place to put them.
 * 3. No automation exists on the write path: there is no endpoint that
 *    upvotes, posts, or performs any action on those platforms, so
 *    bulk/auto engagement is impossible by construction.
 * 4. Rate limits + a per-user unique URL constraint prevent spam.
 * 5. Links start as PENDING and are shown publicly only after a moderator
 *    marks them VERIFIED.
 */

const linkSelect = {
  id: true,
  title: true,
  url: true,
  sourcePlatform: true,
  type: true,
  status: true,
  createdAt: true,
  submittedBy: { select: { id: true, name: true, avatarUrl: true } },
} as const;

/**
 * GET /api/community-links
 * Public: VERIFIED links only. Add ?mine=1 (auth) to list your own,
 * including pending ones. Staff may pass ?status=PENDING|VERIFIED|REJECTED
 * to feed the moderation queue.
 */
export const GET = withErrorHandling(async (req: Request) => {
  const url = new URL(req.url);
  const mine = url.searchParams.get("mine") === "1";
  const status = url.searchParams.get("status");

  if (status) {
    await requireModerator();
    const parsed = z.enum(["PENDING", "VERIFIED", "REJECTED"]).parse(status);
    const links = await prisma.communityLink.findMany({
      where: { status: parsed },
      orderBy: { createdAt: "asc" }, // queue: oldest first
      select: linkSelect,
      take: 100,
    });
    return ok(links);
  }

  if (mine) {
    const user = await requireUser();
    const links = await prisma.communityLink.findMany({
      where: { submittedById: user.id },
      orderBy: { createdAt: "desc" },
      select: linkSelect,
      take: 100,
    });
    return ok(links);
  }

  const links = await prisma.communityLink.findMany({
    where: { status: "VERIFIED" },
    orderBy: { createdAt: "desc" },
    select: linkSelect,
    take: 100,
  });
  return ok(links);
});

/**
 * POST /api/community-links — manually submit a public achievement link.
 * Body: { title, url (https, plataformas del allowlist), type }
 */
export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser();

  if (!(await checkRateLimit(`community-link:${user.id}`, RATE_LIMITS.communityLink))) {
    return errorResponse(429, "Too many link submissions. Try again later.");
  }

  const input = await parseBody(req, createCommunityLinkSchema);

  const duplicate = await prisma.communityLink.findUnique({
    where: { submittedById_url: { submittedById: user.id, url: input.url } },
    select: { id: true },
  });
  if (duplicate) {
    return errorResponse(409, "You already submitted this link");
  }

  const link = await prisma.communityLink.create({
    data: {
      submittedById: user.id,
      title: input.title,
      url: input.url,
      // Derived from the URL's host; the Zod refine guarantees a match.
      sourcePlatform: detectPlatform(input.url) ?? "unknown",
      type: input.type,
    },
    select: linkSelect,
  });

  return created(link);
});
