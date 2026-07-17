/**
 * Frontend DTO types.
 *
 * These mirror the JSON the backend returns 1:1 (see /api/docs for the
 * OpenAPI contract). If the backend contract changes, this is the single
 * file to update — components only import from here.
 */

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

/** Every endpoint responds `{ data }` on success, `{ error }` on failure. */
export interface ApiErrorBody {
  error: { message: string; details?: unknown };
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export type UserRole = "USER" | "MODERATOR" | "ADMIN";

export interface UserRef {
  id: string;
  name: string;
  avatarUrl: string | null;
}

/** GET /api/users/:id — public maker profile. */
export interface PublicUser {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  badges: UserBadgeItem[];
  _count: { products: number; upvotes: number; comments: number; followers: number };
  isFollowedByMe: boolean;
}

/** GET /api/me */
export interface MeProfile {
  id: string;
  name: string;
  username: string | null;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  role: UserRole;
  createdAt: string;
  _count: { products: number; upvotes: number; comments: number };
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export type ProductStatus = "DRAFT" | "SCHEDULED" | "LIVE" | "ARCHIVED";

export interface Category {
  id: string;
  name: string;
  slug: string;
  /** GET /api/categories includes live-product counts. */
  _count?: { products: number };
}

/** Item shape of GET /api/products (productListSelect on the backend). */
export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  launchDate: string;
  status: ProductStatus;
  createdAt: string;
  openToOffers: boolean;
  soldAt: string | null;
  category: { id: string; name: string; slug: string };
  maker: UserRef;
  _count: { upvotes: number; comments: number };
}

/** GET /api/products/:slug adds description, updatedAt and upvotedByMe. */
export interface ProductImage {
  id: string;
  url: string;
  sort: number;
}

export interface ProductDetail extends ProductListItem {
  description: string;
  updatedAt: string;
  upvotedByMe: boolean;
  /** Gallery screenshots (empty for older mocks). */
  images?: ProductImage[];
  /** Puente de compraventa — declarado por el maker, NO verificado. */
  declaredMrrUsd?: number | null;
  monetizationNote?: string | null;
  /** Vistas de la oferta (sin deduplicar); solo tiene sentido para el maker. */
  offerViewCount?: number;
  /** Confirmado por un admin/moderador con evidencia. */
  mrrVerifiedAt?: string | null;
}

export interface ProductListQuery {
  status?: ProductStatus;
  category?: string; // category slug
  q?: string;
  maker?: string; // "me" or a user id
  openToOffers?: boolean;
  sort?: "newest" | "top" | "launching";
  page?: number;
  pageSize?: number;
}

/** POST /api/products body (createProductSchema on the backend). */
export interface CreateProductInput {
  name: string;
  tagline: string;
  description: string;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  categoryId: string;
  launchDate: string; // ISO date
  status?: "DRAFT" | "SCHEDULED" | "LIVE";
  openToOffers?: boolean;
  declaredMrrUsd?: number | null;
  monetizationNote?: string | null;
}

export type ContactRequestStatus = "PENDING" | "SHARED" | "DISMISSED";

export interface ContactRequestItem {
  id: string;
  message: string;
  status: ContactRequestStatus;
  createdAt: string;
  buyer: { name: string };
  product: { name: string; slug: string };
}

// ---------------------------------------------------------------------------
// Engagement
// ---------------------------------------------------------------------------

export interface CommentItem {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  user: UserRef & { badges: { slug: string; icon: string; name: string }[] };
}

/** GET/POST /api/products/:slug/updates — bitácora de progreso del maker. */
export interface ProductUpdateItem {
  id: string;
  body: string;
  createdAt: string;
}

/** POST/DELETE /api/products/:slug/upvote */
export interface UpvoteResult {
  upvoted: boolean;
  upvoteCount: number;
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

/** GET /api/leaderboard — score = launches*10 + upvotes received*2 + comments*1 */
export interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl: string | null;
  launchesCount: number;
  upvotesReceived: number;
  commentsCount: number;
  score: number;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationType = "UPVOTE" | "COMMENT" | "MENTION" | "FOLLOWED_LAUNCH";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  readAt: string | null;
  createdAt: string;
  actor: UserRef;
  product: { id: string; name: string; slug: string } | null;
  comment: { id: string; body: string } | null;
}

export interface NotificationsPage extends Paginated<NotificationItem> {
  unreadCount: number;
}

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------

export type ReportStatus = "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED";

/** Item shape of GET /api/reports (moderator/admin only). */
export interface ModerationReportItem {
  id: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: { id: string; name: string } | null;
  /** null = reporte auto-generado por el sistema (detección de contenido sospechoso). */
  reporter: { id: string; name: string } | null;
  product: { id: string; name: string; slug: string } | null;
  comment: { id: string; body: string } | null;
}

// ---------------------------------------------------------------------------
// Community links (browser extension "Logros")
// ---------------------------------------------------------------------------

export type CommunityLinkStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type CommunityLinkType = "logro" | "milestone" | "announcement" | "other";

export interface CommunityLink {
  id: string;
  title: string;
  url: string;
  sourcePlatform: string;
  type: CommunityLinkType | string;
  status: CommunityLinkStatus;
  createdAt: string;
  submittedBy: UserRef;
}

// ---------------------------------------------------------------------------
// Panel de administración (endpoints /api/admin/*, solo ADMIN)
// ---------------------------------------------------------------------------

export interface AdminStatWindow {
  total: number;
  last7: number;
  last30: number;
}

export interface AdminStats {
  users: AdminStatWindow;
  productsLive: AdminStatWindow;
  upvotes: AdminStatWindow;
  comments: AdminStatWindow;
  contactRequests: AdminStatWindow;
  offerViews: { total: number };
  openToOffers: { total: number };
  pending: { reports: number; communityLinks: number };
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: "USER" | "MODERATOR" | "ADMIN";
  createdAt: string;
  suspendedAt: string | null;
  _count?: { products: number };
}

export interface CollectionSummary {
  id: string;
  title: string;
  slug: string;
  description: string;
  createdAt: string;
  productCount: number;
}

export interface CollectionDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  createdAt: string;
  products: ProductListItem[];
}

export interface BadgeInfo {
  slug: string;
  name: string;
  description: string;
  icon: string;
}

export interface UserBadgeItem extends BadgeInfo {
  grantedByAdmin: boolean;
  createdAt: string;
}

export interface AdminProductItem {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  launchDate: string;
  createdAt: string;
  logoUrl: string | null;
  declaredMrrUsd: number | null;
  mrrVerifiedAt: string | null;
  maker: { name: string; email: string };
  _count: { upvotes: number; comments: number };
}
