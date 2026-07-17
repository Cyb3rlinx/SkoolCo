/**
 * Typed client for the Denveler REST API (contract: /api/docs).
 *
 * All calls are same-origin (`/api/...`), so the NextAuth session cookie is
 * sent automatically — no tokens to manage. Every function here maps 1:1 to
 * a backend endpoint; this file is the frontend↔backend integration surface.
 *
 * Success envelope `{ data }` is unwrapped; error envelope `{ error }` is
 * thrown as ApiClientError so components can branch on `status`.
 */
import type {
  AdminProductItem,
  AdminStats,
  AdminUserItem,
  Category,
  CommentItem,
  CommunityLink,
  ContactRequestItem,
  CreateProductInput,
  LeaderboardEntry,
  MeProfile,
  ModerationReportItem,
  NotificationsPage,
  Paginated,
  ProductDetail,
  ProductListItem,
  PublicUser,
  ProductListQuery,
  ReportStatus,
  UpvoteResult,
} from "./types";

export class ApiClientError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.details = details;
  }
}

/** Network failures get status 0 so callers can distinguish "backend down". */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiClientError(0, "No se pudo conectar con el servidor.");
  }

  if (res.status === 204) return undefined as T;

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ApiClientError(res.status, "Respuesta inválida del servidor.");
  }

  if (!res.ok) {
    const err = (json as { error?: { message?: string; details?: unknown } }).error;
    throw new ApiClientError(res.status, err?.message ?? `Error ${res.status}`, err?.details);
  }

  return (json as { data: T }).data;
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

/** GET /api/products */
export function fetchProducts(query: ProductListQuery = {}) {
  return request<Paginated<ProductListItem>>(
    `/api/products${qs(query as Record<string, string | number | boolean | undefined>)}`
  );
}

/** GET /api/products/:slug */
export function fetchProduct(slug: string) {
  return request<ProductDetail>(`/api/products/${encodeURIComponent(slug)}`);
}

/** POST /api/products (auth) — submit a launch. */
export function createProduct(input: CreateProductInput) {
  return request<ProductDetail>(`/api/products`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** PATCH /api/products/:slug (auth) — maker/staff only. */
export function updateProduct(
  slug: string,
  input: Partial<CreateProductInput> & { status?: string }
) {
  return request<ProductDetail>(`/api/products/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** DELETE /api/products/:slug (auth) — maker/staff only. Soft delete (status → ARCHIVED). */
export function archiveProduct(slug: string) {
  return request<void>(`/api/products/${encodeURIComponent(slug)}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

/**
 * POST /api/uploads (auth) — upload an image (PNG/JPEG/WebP, ≤2MB).
 * Multipart, so it bypasses the JSON `request()` helper on purpose.
 * Returns a stable public URL to use as logoUrl / avatarUrl.
 */
export async function uploadImage(file: File): Promise<{ id: string; url: string }> {
  const form = new FormData();
  form.append("file", file);

  let res: Response;
  try {
    res = await fetch("/api/uploads", { method: "POST", body: form });
  } catch {
    throw new ApiClientError(0, "No se pudo conectar con el servidor.");
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ApiClientError(res.status, "Respuesta inválida del servidor.");
  }

  if (!res.ok) {
    const err = (json as { error?: { message?: string; details?: unknown } }).error;
    throw new ApiClientError(res.status, err?.message ?? `Error ${res.status}`, err?.details);
  }

  return (json as { data: { id: string; url: string } }).data;
}

/** POST /api/products/:slug/images (auth) — add a gallery screenshot. */
export function addProductImage(slug: string, url: string) {
  return request<{ id: string; url: string; sort: number }>(
    `/api/products/${encodeURIComponent(slug)}/images`,
    { method: "POST", body: JSON.stringify({ url }) }
  );
}

/** DELETE /api/products/:slug/images/:id (auth). */
export function deleteProductImage(slug: string, imageId: string) {
  return request<void>(
    `/api/products/${encodeURIComponent(slug)}/images/${encodeURIComponent(imageId)}`,
    { method: "DELETE" }
  );
}

// ---------------------------------------------------------------------------
// Puente de compraventa (Fase 2)
// ---------------------------------------------------------------------------

/** POST /api/products/:slug/contact-requests (auth) — pedir contacto al maker. */
export function requestContact(slug: string, message: string) {
  return request<{ id: string; status: string; createdAt: string }>(
    `/api/products/${encodeURIComponent(slug)}/contact-requests`,
    { method: "POST", body: JSON.stringify({ message }) }
  );
}

/** GET /api/me/contact-requests (auth) — solicitudes recibidas por mis productos. */
export function fetchMyContactRequests() {
  return request<ContactRequestItem[]>(`/api/me/contact-requests`);
}

/** PATCH /api/contact-requests/:id (auth) — compartir email o descartar. */
export function resolveContactRequest(id: string, status: "SHARED" | "DISMISSED") {
  return request<{ id: string; status: string }>(
    `/api/contact-requests/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify({ status }) }
  );
}

/** POST /api/products/:slug/upvote (auth, idempotent). */
export function upvoteProduct(slug: string) {
  return request<UpvoteResult>(`/api/products/${encodeURIComponent(slug)}/upvote`, {
    method: "POST",
  });
}

/** DELETE /api/products/:slug/upvote (auth, idempotent). */
export function removeUpvote(slug: string) {
  return request<UpvoteResult>(`/api/products/${encodeURIComponent(slug)}/upvote`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

/** GET /api/products/:slug/comments */
export function fetchComments(slug: string, page = 1, pageSize = 20) {
  return request<Paginated<CommentItem>>(
    `/api/products/${encodeURIComponent(slug)}/comments${qs({ page, pageSize })}`
  );
}

/** POST /api/products/:slug/comments (auth). Pass parentId to reply (one level deep). */
export function postComment(slug: string, body: string, parentId?: string) {
  return request<CommentItem>(`/api/products/${encodeURIComponent(slug)}/comments`, {
    method: "POST",
    body: JSON.stringify(parentId ? { body, parentId } : { body }),
  });
}

// ---------------------------------------------------------------------------
// Categories & leaderboard
// ---------------------------------------------------------------------------

/** GET /api/categories */
export function fetchCategories() {
  return request<Category[]>(`/api/categories`);
}

/** GET /api/leaderboard */
export function fetchLeaderboard() {
  return request<LeaderboardEntry[]>(`/api/leaderboard`);
}

// ---------------------------------------------------------------------------
// Auth & account
// ---------------------------------------------------------------------------

/** POST /api/auth/register — sign-in afterwards is done via next-auth signIn(). */
export function registerUser(input: { name: string; email: string; password: string }) {
  return request<{ id: string; name: string; email: string }>(`/api/auth/register`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** POST /api/auth/forgot-password — always 200 (no user enumeration). */
export function forgotPassword(email: string) {
  return request<{ ok: boolean }>(`/api/auth/forgot-password`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/** POST /api/auth/reset-password */
export function resetPassword(token: string, password: string) {
  return request<{ ok: boolean }>(`/api/auth/reset-password`, {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

/** POST /api/auth/verify-email */
export function verifyEmail(token: string) {
  return request<{ ok: boolean }>(`/api/auth/verify-email`, {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

/** POST /api/auth/resend-verification */
export function resendVerification(email: string) {
  return request<{ ok: boolean }>(`/api/auth/resend-verification`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/** GET /api/me (auth) */
export function fetchMe() {
  return request<MeProfile>(`/api/me`);
}

/** PATCH /api/me (auth) */
export function updateMe(input: { name?: string; bio?: string; avatarUrl?: string | null }) {
  return request<MeProfile>(`/api/me`, { method: "PATCH", body: JSON.stringify(input) });
}

/** DELETE /api/me (auth) — permanent; requires password confirmation. 204. */
export function deleteAccount(password: string) {
  return request<void>(`/api/me`, { method: "DELETE", body: JSON.stringify({ password }) });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

/** GET /api/notifications (auth) */
export function fetchNotifications(page = 1, pageSize = 10) {
  return request<NotificationsPage>(`/api/notifications${qs({ page, pageSize })}`);
}

/** PATCH /api/notifications/read (auth) — without ids marks ALL as read. */
export function markNotificationsRead(ids?: string[]) {
  return request<{ updated: number }>(`/api/notifications/read`, {
    method: "PATCH",
    body: JSON.stringify(ids ? { ids } : {}),
  });
}

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------

/** GET /api/reports?status= (moderator/admin) */
export function fetchReports(status?: ReportStatus) {
  return request<ModerationReportItem[]>(`/api/reports${qs({ status })}`);
}

/** PATCH /api/reports/:id (moderator/admin) */
export function resolveReport(id: string, status: Exclude<ReportStatus, "OPEN">) {
  return request<ModerationReportItem>(`/api/reports/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

/** POST /api/reports (auth) — report a product or a comment. */
export function createReport(input: { productId?: string; commentId?: string; reason: string }) {
  return request<{ id: string; status: ReportStatus; createdAt: string }>(`/api/reports`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ---------------------------------------------------------------------------
// Community links (extension "Logros")
// ---------------------------------------------------------------------------

/** GET /api/community-links — public VERIFIED links (?mine=1 for your own). */
export function fetchCommunityLinks(mine = false) {
  return request<CommunityLink[]>(`/api/community-links${mine ? "?mine=1" : ""}`);
}

/** GET /api/community-links?status=… (staff) — moderation queue. */
export function fetchCommunityLinksByStatus(status: "PENDING" | "VERIFIED" | "REJECTED") {
  return request<CommunityLink[]>(`/api/community-links?status=${status}`);
}

/** GET /api/users/:id — public maker profile. */
export function fetchUser(id: string) {
  return request<PublicUser>(`/api/users/${encodeURIComponent(id)}`);
}

/** POST /api/community-links (auth) — submit a public skool.com achievement link. */
export function submitCommunityLink(input: {
  title: string;
  url: string;
  type?: "logro" | "milestone" | "announcement" | "other";
}) {
  return request<CommunityLink>(`/api/community-links`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * PATCH /api/community-links/:id (moderator/admin) — verify or reject a link.
 *
 * NOTE: there is currently no endpoint to LIST pending links for moderators
 * (GET only returns VERIFIED, or ?mine=1). The admin queue therefore relies
 * on the mock fallback for the pending list.
 * TODO(backend): add GET /api/community-links?status=PENDING (staff only).
 */
export function moderateCommunityLink(id: string, status: "VERIFIED" | "REJECTED") {
  return request<{ id: string; status: string }>(
    `/api/community-links/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify({ status }) }
  );
}

// ---------------------------------------------------------------------------
// Panel de administración (solo ADMIN)
// ---------------------------------------------------------------------------

/** GET /api/admin/stats */
export function fetchAdminStats() {
  return request<AdminStats>("/api/admin/stats");
}

/** GET /api/admin/users */
export function fetchAdminUsers(q: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("page", String(page));
  return request<Paginated<AdminUserItem>>(`/api/admin/users?${params}`);
}

/** PATCH /api/admin/users/:id */
export function updateAdminUser(
  id: string,
  input: { role?: "USER" | "MODERATOR" | "ADMIN"; suspended?: boolean }
) {
  return request<AdminUserItem>(`/api/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** DELETE /api/admin/users/:id */
export function deleteAdminUser(id: string) {
  return request<void>(`/api/admin/users/${id}`, { method: "DELETE" });
}

/** GET /api/admin/products */
export function fetchAdminProducts(q: string, status: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  params.set("page", String(page));
  return request<Paginated<AdminProductItem>>(`/api/admin/products?${params}`);
}
