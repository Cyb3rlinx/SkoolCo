import { z } from "zod";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(500).optional(),
  avatarUrl: z.string().url().max(2048).optional().nullable(),
});

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(80),
  tagline: z.string().trim().min(4).max(140),
  description: z.string().trim().min(10).max(5000),
  websiteUrl: z.string().url().max(2048).optional().nullable(),
  logoUrl: z.string().url().max(2048).optional().nullable(),
  categoryId: z.string().min(1),
  launchDate: z.coerce.date(),
  status: z.enum(["DRAFT", "SCHEDULED", "LIVE"]).default("DRAFT"),
});

export const updateProductSchema = createProductSchema
  .partial()
  .extend({ status: z.enum(["DRAFT", "SCHEDULED", "LIVE", "ARCHIVED"]).optional() });

export const listProductsQuerySchema = z.object({
  status: z.enum(["DRAFT", "SCHEDULED", "LIVE", "ARCHIVED"]).optional(),
  category: z.string().optional(), // category slug
  q: z.string().trim().min(1).max(100).optional(), // free-text search
  sort: z.enum(["newest", "top", "launching"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

// ---------------------------------------------------------------------------
// Comments & reports
// ---------------------------------------------------------------------------

export const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export const createReportSchema = z
  .object({
    productId: z.string().optional(),
    commentId: z.string().optional(),
    reason: z.string().trim().min(5).max(1000),
  })
  .refine((v) => Boolean(v.productId) !== Boolean(v.commentId), {
    message: "Provide exactly one of productId or commentId",
  });

export const resolveReportSchema = z.object({
  status: z.enum(["REVIEWING", "RESOLVED", "DISMISSED"]),
});

// ---------------------------------------------------------------------------
// Community links (browser extension — manual, consent-based submissions)
// ---------------------------------------------------------------------------

/**
 * Only public Skool post URLs are accepted, and only when a signed-in user
 * explicitly submits one. The backend never fetches private data, never
 * stores third-party credentials, and never triggers actions on Skool.
 */
export const createCommunityLinkSchema = z.object({
  title: z.string().trim().min(2).max(140),
  url: z
    .string()
    .trim()
    .url()
    .max(2048)
    .refine((u) => {
      try {
        const parsed = new URL(u);
        return parsed.protocol === "https:" && parsed.hostname.endsWith("skool.com");
      } catch {
        return false;
      }
    }, "Only public https://…skool.com links are accepted"),
  type: z.enum(["logro", "milestone", "announcement", "other"]).default("logro"),
});

export const extensionEventSchema = z.object({
  eventType: z.enum(["link_submitted", "link_viewed", "extension_opened"]),
  metadata: z.record(z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Password reset & email verification
// ---------------------------------------------------------------------------

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10).max(256),
  password: z.string().min(8).max(128),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10).max(256),
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const listNotificationsQuerySchema = z.object({
  unread: z.coerce.boolean().optional(), // ?unread=true → only unread
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

/** Without `ids`, marks ALL of the user's notifications as read. */
export const markNotificationsReadSchema = z.object({
  ids: z.array(z.string().min(1).max(64)).min(1).max(100).optional(),
});

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

/** Deleting an account is destructive: the session alone is not enough. */
export const deleteAccountSchema = z.object({
  password: z.string().min(8).max(128),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Turn a name into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
