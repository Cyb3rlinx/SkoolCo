import { z } from "zod";
import { detectPlatform } from "@/lib/platforms";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
});

/** Absolute http(s) URL or an internal uploaded-image path (/api/uploads/:id). */
export const imageUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (v) => /^https?:\/\/.+/.test(v) || /^\/api\/uploads\/[a-z0-9]+$/i.test(v),
    "Must be a full URL (https://…) or an uploaded image path"
  );

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(500).optional(),
  avatarUrl: imageUrlSchema.optional().nullable(),
});

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(80),
  tagline: z.string().trim().min(4).max(140),
  description: z.string().trim().min(10).max(5000),
  websiteUrl: z.string().url().max(2048).optional().nullable(),
  logoUrl: imageUrlSchema.optional().nullable(),
  categoryId: z.string().min(1),
  launchDate: z.coerce.date(),
  status: z.enum(["DRAFT", "SCHEDULED", "LIVE"]).default("DRAFT"),
  // --- Puente de compraventa: métricas DECLARADAS por el maker (no verificadas) ---
  openToOffers: z.boolean().optional(),
  declaredMrrUsd: z.number().int().min(0).max(10_000_000).optional().nullable(),
  monetizationNote: z.string().trim().max(200).optional().nullable(),
});

export const updateProductSchema = createProductSchema
  .partial()
  .extend({ status: z.enum(["DRAFT", "SCHEDULED", "LIVE", "ARCHIVED"]).optional() });

export const addProductImageSchema = z.object({ url: imageUrlSchema });

/** Gallery cap per product — keeps pages fast and abuse bounded. */
export const MAX_PRODUCT_IMAGES = 5;

export const createContactRequestSchema = z.object({
  message: z.string().trim().min(20).max(1000),
});

export const listProductsQuerySchema = z.object({
  status: z.enum(["DRAFT", "SCHEDULED", "LIVE", "ARCHIVED"]).optional(),
  category: z.string().optional(), // category slug
  q: z.string().trim().min(1).max(100).optional(), // free-text search
  maker: z.string().trim().min(1).max(40).optional(), // "me" or a user id
  sort: z.enum(["newest", "top", "launching", "trending"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

// ---------------------------------------------------------------------------
// Comments & reports
// ---------------------------------------------------------------------------

export const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  parentId: z.string().min(1).optional(),
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
 * Only public https URLs from the platform allowlist (src/lib/platforms.ts:
 * Skool, Discord, YouTube, X, Facebook, LinkedIn, Instagram, Telegram,
 * Circle) are accepted, and only when a signed-in user explicitly submits
 * one. The backend never fetches private data, never stores third-party
 * credentials, and never triggers actions on those platforms.
 */
export const createCommunityLinkSchema = z.object({
  title: z.string().trim().min(2).max(140),
  url: z
    .string()
    .trim()
    .url()
    .max(2048)
    .refine(
      (u) => detectPlatform(u) !== null,
      "Only public https links from supported community platforms are accepted"
    ),
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
// Admin
// ---------------------------------------------------------------------------

/** PATCH /api/admin/users/:id — al menos un campo. */
export const adminUpdateUserSchema = z
  .object({
    role: z.enum(["USER", "MODERATOR", "ADMIN"]).optional(),
    suspended: z.boolean().optional(),
  })
  .refine((v) => v.role !== undefined || v.suspended !== undefined, {
    message: "Debes enviar al menos un cambio (role o suspended).",
  });

/** POST /api/contact — formulario público de contacto. */
export const contactMessageSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  message: z.string().trim().min(10).max(2000),
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
