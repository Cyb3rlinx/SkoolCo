/**
 * Mock data for the marketing landing page.
 * TODO(backend): swap for api-client calls (GET /api/leaderboard, /api/products)
 * when the landing goes live — shapes intentionally mirror the API DTOs.
 */

export type TrendDirection = "up" | "down";

export interface TopMaker {
  rank: number;
  name: string;
  initials: string;
  points: number;
  trend: TrendDirection;
}

export const TOP_MAKERS: TopMaker[] = [
  { rank: 1, name: "Ana Maker", initials: "AM", points: 36, trend: "up" },
  { rank: 2, name: "Sofía Design", initials: "SD", points: 29, trend: "up" },
  { rank: 3, name: "Marco Data", initials: "MD", points: 27, trend: "down" },
  { rank: 4, name: "Luis Builder", initials: "LB", points: 20, trend: "up" },
  { rank: 5, name: "Morgan Mod", initials: "MM", points: 12, trend: "down" },
];

export interface ActivityItem {
  actor: string;
  initials: string;
  action: string;
  target: string;
  when: string;
}

export const RECENT_ACTIVITY: ActivityItem[] = [
  { actor: "Ana Maker", initials: "AM", action: "votó", target: "FocusFlow", when: "Hace 13 min" },
  { actor: "Luis Builder", initials: "LB", action: "comentó en", target: "MeetingLite", when: "Hace 25 min" },
  { actor: "Marco Data", initials: "MD", action: "votó", target: "SchemaPeek", when: "Hace 28 min" },
  { actor: "Sofía Design", initials: "SD", action: "comentó en", target: "APIWatch", when: "Hace 1 h" },
];

export interface LaunchItem {
  rank: number;
  name: string;
  tagline: string;
  category: string;
  maker: string;
  makerInitials: string;
  comments: number;
  votes: number;
  /** Brand-approved accent for the product tile (see palette in the spec). */
  color: string;
  initial: string;
  spark: number[];
}

export const FEATURED_LAUNCH: LaunchItem = {
  rank: 1,
  name: "FocusFlow",
  tagline: "Organiza tus tareas, elimina distracciones y enfoca tu energía en lo que importa.",
  category: "Productividad",
  maker: "Ana Maker",
  makerInitials: "AM",
  comments: 4,
  votes: 142,
  color: "#0F8F8A",
  initial: "F",
  spark: [12, 18, 14, 24, 20, 32, 28, 41, 38, 52, 61, 74],
};

export const LAUNCHES: LaunchItem[] = [
  {
    rank: 2,
    name: "SchemaPeek",
    tagline: "Visualiza cualquier base de datos en segundos.",
    category: "Developer Tools",
    maker: "Sofía Design",
    makerInitials: "SD",
    comments: 3,
    votes: 98,
    color: "#D9289D",
    initial: "S",
    spark: [8, 14, 12, 18, 16, 26, 24, 34],
  },
  {
    rank: 3,
    name: "MeetingLite",
    tagline: "Agendas y notas de reuniones en 2 clics.",
    category: "Productividad",
    maker: "Luis Builder",
    makerInitials: "LB",
    comments: 2,
    votes: 76,
    color: "#2389E8",
    initial: "M",
    spark: [10, 9, 14, 12, 20, 18, 25, 28],
  },
  {
    rank: 4,
    name: "APIWatch",
    tagline: "Monitorea y protege tus APIs en tiempo real.",
    category: "Developer Tools",
    maker: "Marco Data",
    makerInitials: "MD",
    comments: 1,
    votes: 61,
    color: "#F97316",
    initial: "A",
    spark: [6, 10, 8, 14, 13, 18, 17, 22],
  },
  {
    rank: 5,
    name: "PromptShelf",
    tagline: "Organiza, versiona y comparte tus prompts.",
    category: "AI & Machine Learning",
    maker: "Morgan Mod",
    makerInitials: "MM",
    comments: 0,
    votes: 54,
    color: "#8B5CF6",
    initial: "P",
    spark: [4, 8, 7, 12, 10, 15, 16, 19],
  },
];

/** Weekly new-votes bars for the "Momento de la comunidad" card. */
export const MOMENTUM_BARS = [14, 22, 18, 30, 26, 38, 34, 46, 40, 52, 58, 66];

export const MOMENTUM = { count: 248, deltaLabel: "18% vs. semana pasada" };
