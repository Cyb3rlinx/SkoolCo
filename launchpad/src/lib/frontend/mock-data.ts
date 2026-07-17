/**
 * Mock data for demo mode.
 *
 * Mirrors `prisma/seed.ts` (same users, products, vote/comment counts) so the
 * UI looks identical whether it renders mocks or a freshly seeded database.
 * Used ONLY as a fallback when the API is unreachable (e.g. no DATABASE_URL
 * yet) — see `useApi` in hooks.ts. IDs are prefixed `mock_` so they can never
 * be confused with real cuids.
 */
import type {
  Category,
  CollaborationItem,
  CommentItem,
  CommunityLink,
  LeaderboardEntry,
  MakerRef,
  MeProfile,
  ModerationReportItem,
  NotificationItem,
  NotificationsPage,
  Paginated,
  ProductDetail,
  ProductListItem,
  UserRef,
} from "./types";

const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();
const daysAhead = (d: number) => new Date(now + d * 86_400_000).toISOString();
const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();

// --- Users -----------------------------------------------------------------

const users = {
  ana: { id: "mock_u_ana", name: "Ana Maker", avatarUrl: null, verifiedAt: daysAgo(30) },
  luis: { id: "mock_u_luis", name: "Luis Builder", avatarUrl: null, verifiedAt: null },
  sofia: { id: "mock_u_sofia", name: "Sofía Design", avatarUrl: null, verifiedAt: null },
  marco: { id: "mock_u_marco", name: "Marco Data", avatarUrl: null, verifiedAt: null },
  mod: { id: "mock_u_mod", name: "Morgan Mod", avatarUrl: null, verifiedAt: null },
} satisfies Record<string, MakerRef>;

// --- Categories --------------------------------------------------------------

export const mockCategories: Category[] = [
  { id: "mock_c_ai", name: "AI & Machine Learning", slug: "ai-machine-learning", _count: { products: 1 } },
  { id: "mock_c_community", name: "Community", slug: "community", _count: { products: 0 } },
  { id: "mock_c_dev", name: "Developer Tools", slug: "developer-tools", _count: { products: 2 } },
  { id: "mock_c_edu", name: "Education", slug: "education", _count: { products: 1 } },
  { id: "mock_c_finance", name: "Finance", slug: "finance", _count: { products: 1 } },
  { id: "mock_c_prod", name: "Productivity", slug: "productivity", _count: { products: 2 } },
];

const cat = (slug: string) => {
  const c = mockCategories.find((c) => c.slug === slug)!;
  return { id: c.id, name: c.name, slug: c.slug };
};

// --- Products ----------------------------------------------------------------

interface MockProductInput {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  maker: MakerRef;
  category: ReturnType<typeof cat>;
  launchDate: string;
  upvotes: number;
  comments: number;
  status?: ProductListItem["status"];
}

function product(p: MockProductInput): ProductDetail {
  return {
    id: `mock_p_${p.slug}`,
    name: p.name,
    slug: p.slug,
    tagline: p.tagline,
    description: p.description,
    logoUrl: null,
    websiteUrl: `https://example.com/${p.slug}`,
    launchDate: p.launchDate,
    status: p.status ?? "LIVE",
    createdAt: p.launchDate,
    updatedAt: p.launchDate,
    category: p.category,
    maker: p.maker,
    _count: { upvotes: p.upvotes, comments: p.comments },
    upvotedByMe: false,
    openToOffers: false,
    soldAt: null,
  };
}

/** Same 7 LIVE products as the seed; SchemaPeek moved to *today* so the
 * "Hoy" tab has something to show in demo mode. */
export const mockProductDetails: ProductDetail[] = [
  product({
    slug: "schemapeek",
    name: "SchemaPeek",
    tagline: "Visualize any database schema in seconds",
    description:
      "Point SchemaPeek at a connection string and get an interactive ER diagram, table stats and index suggestions.",
    maker: users.luis,
    category: cat("developer-tools"),
    launchDate: hoursAgo(5),
    upvotes: 4,
    comments: 2,
  }),
  product({
    slug: "meetinglite",
    name: "MeetingLite",
    tagline: "Agendas that keep meetings under 25 minutes",
    description:
      "Shared agendas with per-topic timers, automatic notes and action items sent to Slack. Built for teams tired of hour-long syncs.",
    maker: users.sofia,
    category: cat("productivity"),
    launchDate: daysAgo(2),
    upvotes: 3,
    comments: 1,
  }),
  product({
    slug: "focusflow",
    name: "FocusFlow",
    tagline: "Deep-work timer that adapts to your energy",
    description:
      "FocusFlow learns when you do your best work and schedules focus blocks automatically. Integrates with your calendar and blocks distracting sites during sessions.",
    maker: users.ana,
    category: cat("productivity"),
    launchDate: daysAgo(3),
    upvotes: 5,
    comments: 3,
  }),
  product({
    slug: "apiwatch",
    name: "APIWatch",
    tagline: "Uptime and contract monitoring for your APIs",
    description:
      "Monitors endpoints, validates response schemas against your OpenAPI spec and alerts on breaking changes before your users notice.",
    maker: users.marco,
    category: cat("developer-tools"),
    launchDate: daysAgo(5),
    upvotes: 2,
    comments: 1,
  }),
  product({
    slug: "lingualoop",
    name: "LinguaLoop",
    tagline: "Daily 5-minute language practice with real news",
    description:
      "Reads today's headlines at your level, quizzes you on vocabulary and tracks a streak. Spanish, English and Portuguese at launch.",
    maker: users.sofia,
    category: cat("education"),
    launchDate: daysAgo(7),
    upvotes: 1,
    comments: 1,
  }),
  product({
    slug: "promptshelf",
    name: "PromptShelf",
    tagline: "Organize, version and share your AI prompts",
    description:
      "A library for teams to store prompts with version history, tags and one-click testing against multiple models.",
    maker: users.ana,
    category: cat("ai-machine-learning"),
    launchDate: daysAgo(10),
    upvotes: 2,
    comments: 0,
  }),
  product({
    slug: "coinpath",
    name: "CoinPath",
    tagline: "Understand where your crypto portfolio drifted",
    description:
      "Connects read-only to your exchanges, explains portfolio drift in plain language and suggests rebalancing scenarios. No keys with withdrawal rights, ever.",
    maker: users.marco,
    category: cat("finance"),
    launchDate: daysAgo(12),
    upvotes: 1,
    comments: 0,
  }),
  product({
    slug: "coursecraft",
    name: "CourseCraft",
    tagline: "Turn your knowledge into a cohort course",
    description:
      "Everything you need to run a cohort-based course: curriculum builder, live sessions, community and payments.",
    maker: users.luis,
    category: cat("education"),
    launchDate: daysAhead(7),
    upvotes: 0,
    comments: 0,
    status: "SCHEDULED",
  }),
];

export const mockProducts: ProductListItem[] = mockProductDetails
  .filter((p) => p.status === "LIVE")
  .map(({ description: _d, upvotedByMe: _u, ...item }) => item);

export function paginate<T>(items: T[], page = 1, pageSize = 20): Paginated<T> {
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    total: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
  };
}

/**
 * Demo-mode twin of GET /api/products: applies q/category/sort/pagination to
 * the mock catalog so search and filters behave even without a backend.
 */
export function filterMockProducts(query: {
  q?: string;
  category?: string;
  sort?: "newest" | "top" | "launching" | "trending";
  page?: number;
  pageSize?: number;
} = {}): Paginated<ProductListItem> {
  const q = query.q?.trim().toLowerCase();
  let details = mockProductDetails.filter((p) => p.status === "LIVE");

  if (query.category) details = details.filter((p) => p.category.slug === query.category);
  if (q) {
    details = details.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }

  // Los mocks no tienen timestamps por voto individual, así que "trending"
  // (votos recientes) se aproxima con "top" en modo demo — mejor esfuerzo
  // razonable sin datos reales, no una simulación falsa de tendencia.
  const sorted = [...details].sort((a, b) =>
    query.sort === "top" || query.sort === "trending"
      ? b._count.upvotes - a._count.upvotes
      : new Date(b.launchDate).getTime() - new Date(a.launchDate).getTime()
  );

  const items = sorted.map(({ description: _d, upvotedByMe: _u, ...item }) => item);
  return paginate(items, query.page ?? 1, query.pageSize ?? 20);
}

// --- Comments (same authors/bodies as the seed) -------------------------------

export const mockCommentsByProduct: Record<string, CommentItem[]> = {
  focusflow: [
    {
      id: "mock_cm_1",
      body: "Congrats on the launch! The adaptive scheduling is a great idea.",
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
      parentId: null,
      user: { ...users.luis, badges: [] },
    },
    {
      id: "mock_cm_2",
      body: "Been beta testing this for two weeks — genuinely helps.",
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
      parentId: null,
      user: { ...users.mod, badges: [] },
    },
    {
      id: "mock_cm_3",
      body: "How does it decide when I'm at my best? Calendar history or manual input?",
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
      parentId: null,
      user: { ...users.marco, badges: [] },
    },
  ],
  schemapeek: [
    {
      id: "mock_cm_4",
      body: "The ER diagrams look super clean. Does it support Postgres views?",
      createdAt: hoursAgo(3),
      updatedAt: hoursAgo(3),
      parentId: null,
      user: { ...users.ana, badges: [] },
    },
    {
      id: "mock_cm_5",
      body: "Tried it on our staging DB — the index suggestions alone are worth it.",
      createdAt: hoursAgo(1),
      updatedAt: hoursAgo(1),
      parentId: null,
      user: { ...users.sofia, badges: [] },
    },
  ],
  meetinglite: [
    {
      id: "mock_cm_6",
      body: "The per-topic timer changed our standups. Great launch!",
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
      parentId: null,
      user: { ...users.luis, badges: [] },
    },
  ],
  apiwatch: [
    {
      id: "mock_cm_7",
      body: "Schema-contract alerts are something I didn't know I needed.",
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
      parentId: null,
      user: { ...users.ana, badges: [] },
    },
  ],
  lingualoop: [
    {
      id: "mock_cm_8",
      body: "The streak with real news keeps me coming back. Nice touch.",
      createdAt: daysAgo(6),
      updatedAt: daysAgo(6),
      parentId: null,
      user: { ...users.mod, badges: [] },
    },
  ],
};

// --- Leaderboard (scores follow launches*10 + upvotes*2 + comments*1) ----------

export const mockLeaderboard: LeaderboardEntry[] = [
  { userId: users.ana.id, name: users.ana.name, avatarUrl: null, launchesCount: 2, upvotesReceived: 7, commentsCount: 2, score: 36 },
  { userId: users.sofia.id, name: users.sofia.name, avatarUrl: null, launchesCount: 2, upvotesReceived: 4, commentsCount: 1, score: 29 },
  { userId: users.marco.id, name: users.marco.name, avatarUrl: null, launchesCount: 2, upvotesReceived: 3, commentsCount: 1, score: 27 },
  { userId: users.luis.id, name: users.luis.name, avatarUrl: null, launchesCount: 1, upvotesReceived: 4, commentsCount: 2, score: 20 },
  { userId: users.mod.id, name: users.mod.name, avatarUrl: null, launchesCount: 0, upvotesReceived: 0, commentsCount: 2, score: 2 },
];

// --- Profile (demo viewpoint: Ana) --------------------------------------------

export const mockMe: MeProfile = {
  id: users.ana.id,
  name: users.ana.name,
  username: "ana",
  email: "ana@example.com",
  avatarUrl: null,
  bio: "Indie hacker shipping weekly",
  role: "USER",
  createdAt: daysAgo(90),
  _count: { products: 3, upvotes: 5, comments: 2 },
};

export const mockMyProducts: ProductListItem[] = mockProductDetails
  .filter((p) => p.maker.id === users.ana.id)
  .map(({ description: _d, upvotedByMe: _u, ...item }) => item);

// --- Notifications --------------------------------------------------------------

const mockNotifications: NotificationItem[] = [
  {
    id: "mock_n_1",
    type: "UPVOTE",
    readAt: null,
    createdAt: hoursAgo(2),
    actor: users.luis,
    product: { id: "mock_p_focusflow", name: "FocusFlow", slug: "focusflow" },
    comment: null,
  },
  {
    id: "mock_n_2",
    type: "COMMENT",
    readAt: null,
    createdAt: hoursAgo(6),
    actor: users.marco,
    product: { id: "mock_p_focusflow", name: "FocusFlow", slug: "focusflow" },
    comment: { id: "mock_cm_3", body: "How does it decide when I'm at my best?" },
  },
  {
    id: "mock_n_3",
    type: "UPVOTE",
    readAt: daysAgo(1),
    createdAt: daysAgo(1),
    actor: users.sofia,
    product: { id: "mock_p_promptshelf", name: "PromptShelf", slug: "promptshelf" },
    comment: null,
  },
];

export const mockNotificationsPage: NotificationsPage = {
  ...paginate(mockNotifications),
  unreadCount: 2,
};

// --- Moderation queue -------------------------------------------------------------

export const mockReports: ModerationReportItem[] = [
  {
    id: "mock_r_1",
    reason: "Example report for testing the moderation queue.",
    category: "OTHER",
    status: "OPEN",
    createdAt: daysAgo(1),
    resolvedAt: null,
    resolvedBy: null,
    reporter: { id: users.luis.id, name: users.luis.name },
    product: { id: "mock_p_promptshelf", name: "PromptShelf", slug: "promptshelf" },
    comment: null,
  },
];

// --- Community links ("Logros" wall + extension demo) -------------------------------

export const mockCommunityLinks: CommunityLink[] = [
  {
    id: "mock_l_1",
    title: "Reached my first 100 users! 🎉",
    url: "https://www.skool.com/example-community/example-logro-post",
    sourcePlatform: "skool",
    type: "logro",
    status: "VERIFIED",
    createdAt: daysAgo(2),
    submittedBy: users.ana,
  },
  {
    id: "mock_l_2",
    title: "Cerré mi primer cliente de consultoría gracias a la comunidad",
    url: "https://www.skool.com/example-community/primer-cliente",
    sourcePlatform: "skool",
    type: "milestone",
    status: "VERIFIED",
    createdAt: daysAgo(4),
    submittedBy: users.marco,
  },
  {
    id: "mock_l_3",
    title: "Mi curso pasó los 50 alumnos 🚀",
    url: "https://www.skool.com/example-community/curso-50-alumnos",
    sourcePlatform: "skool",
    type: "logro",
    status: "VERIFIED",
    createdAt: daysAgo(6),
    submittedBy: users.sofia,
  },
];

/** "Mis links" demo list for the extension mockup (includes non-verified). */
export const mockMyLinks: CommunityLink[] = [
  mockCommunityLinks[0],
  {
    id: "mock_l_4",
    title: "Terminé el reto de 30 días de código",
    url: "https://www.skool.com/example-community/reto-30-dias",
    sourcePlatform: "skool",
    type: "logro",
    status: "PENDING",
    createdAt: hoursAgo(8),
    submittedBy: users.ana,
  },
];

// --- Collaborations ---------------------------------------------------------------

export const mockCollaborations: CollaborationItem[] = [
  {
    id: "mock-collab-1",
    type: "NEEDS",
    title: "Necesito automatizar soporte al cliente",
    description: "Busco a alguien que integre WhatsApp + GPT-4o + Shopify para atención automática 24/7.",
    tags: ["automatizacion", "whatsapp", "ia"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: { id: "mock-user-1", name: "Ana Maker", avatarUrl: null },
  },
  {
    id: "mock-collab-2",
    type: "OFFERS",
    title: "Ofrezco diseño UI/UX para SaaS",
    description: "5 años diseñando dashboards y onboarding para productos B2B. Portfolio disponible.",
    tags: ["diseño", "ui", "ux"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: { id: "mock-user-2", name: "Luis Diseñador", avatarUrl: null },
  },
];
