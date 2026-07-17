/**
 * Mock data for the marketing landing page.
 * TODO(backend): swap for api-client calls (GET /api/leaderboard, /api/products)
 * when the landing goes live — shapes intentionally mirror the API DTOs.
 *
 * Names/initials/colors/numbers are locale-independent; copy (taglines,
 * categories, activity verbs) is translated per locale below.
 */

export type TrendDirection = "up" | "down";
export type LandingLocale = "es" | "en" | "zh";

export interface TopMaker {
  rank: number;
  name: string;
  initials: string;
  points: number;
  trend: TrendDirection;
}

export interface ActivityItem {
  actor: string;
  initials: string;
  action: string;
  target: string;
  when: string;
}

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

const TOP_MAKERS: TopMaker[] = [
  { rank: 1, name: "Ana Maker", initials: "AM", points: 36, trend: "up" },
  { rank: 2, name: "Sofía Design", initials: "SD", points: 29, trend: "up" },
  { rank: 3, name: "Marco Data", initials: "MD", points: 27, trend: "down" },
  { rank: 4, name: "Luis Builder", initials: "LB", points: 20, trend: "up" },
  { rank: 5, name: "Morgan Mod", initials: "MM", points: 12, trend: "down" },
];

const ACTIVITY_COPY: Record<LandingLocale, { voted: string; commentedOn: string; when: string[] }> = {
  es: { voted: "votó", commentedOn: "comentó en", when: ["Hace 13 min", "Hace 25 min", "Hace 28 min", "Hace 1 h"] },
  en: { voted: "upvoted", commentedOn: "commented on", when: ["13 min ago", "25 min ago", "28 min ago", "1 h ago"] },
  zh: { voted: "投票支持了", commentedOn: "评论了", when: ["13 分钟前", "25 分钟前", "28 分钟前", "1 小时前"] },
};

function getActivity(locale: LandingLocale): ActivityItem[] {
  const c = ACTIVITY_COPY[locale];
  return [
    { actor: "Ana Maker", initials: "AM", action: c.voted, target: "FocusFlow", when: c.when[0] },
    { actor: "Luis Builder", initials: "LB", action: c.commentedOn, target: "MeetingLite", when: c.when[1] },
    { actor: "Marco Data", initials: "MD", action: c.voted, target: "SchemaPeek", when: c.when[2] },
    { actor: "Sofía Design", initials: "SD", action: c.commentedOn, target: "APIWatch", when: c.when[3] },
  ];
}

const CATEGORY_COPY: Record<LandingLocale, Record<string, string>> = {
  es: {
    productivity: "Productividad",
    devtools: "Developer Tools",
    ai: "AI & Machine Learning",
  },
  en: {
    productivity: "Productivity",
    devtools: "Developer Tools",
    ai: "AI & Machine Learning",
  },
  zh: {
    productivity: "效率工具",
    devtools: "开发者工具",
    ai: "人工智能",
  },
};

const TAGLINE_COPY: Record<LandingLocale, Record<string, string>> = {
  es: {
    focusflow: "Organiza tus tareas, elimina distracciones y enfoca tu energía en lo que importa.",
    schemapeek: "Visualiza cualquier base de datos en segundos.",
    meetinglite: "Agendas y notas de reuniones en 2 clics.",
    apiwatch: "Monitorea y protege tus APIs en tiempo real.",
    promptshelf: "Organiza, versiona y comparte tus prompts.",
  },
  en: {
    focusflow: "Organize your tasks, cut distractions, and focus your energy on what matters.",
    schemapeek: "Visualize any database in seconds.",
    meetinglite: "Meeting agendas and notes in 2 clicks.",
    apiwatch: "Monitor and protect your APIs in real time.",
    promptshelf: "Organize, version, and share your prompts.",
  },
  zh: {
    focusflow: "整理你的任务，减少干扰，把精力集中在重要的事情上。",
    schemapeek: "几秒钟可视化任意数据库结构。",
    meetinglite: "两次点击搞定会议日程和笔记。",
    apiwatch: "实时监控并保护你的 API。",
    promptshelf: "整理、管理版本并分享你的提示词。",
  },
};

function launch(
  locale: LandingLocale,
  base: Omit<LaunchItem, "tagline" | "category"> & { taglineKey: string; categoryKey: string }
): LaunchItem {
  const { taglineKey, categoryKey, ...rest } = base;
  return {
    ...rest,
    tagline: TAGLINE_COPY[locale][taglineKey],
    category: CATEGORY_COPY[locale][categoryKey],
  };
}

export function getFeaturedLaunch(locale: LandingLocale): LaunchItem {
  return launch(locale, {
    rank: 1,
    name: "FocusFlow",
    taglineKey: "focusflow",
    categoryKey: "productivity",
    maker: "Ana Maker",
    makerInitials: "AM",
    comments: 4,
    votes: 142,
    color: "#0F8F8A",
    initial: "F",
    spark: [12, 18, 14, 24, 20, 32, 28, 41, 38, 52, 61, 74],
  });
}

export function getLaunches(locale: LandingLocale): LaunchItem[] {
  return [
    launch(locale, {
      rank: 2,
      name: "SchemaPeek",
      taglineKey: "schemapeek",
      categoryKey: "devtools",
      maker: "Sofía Design",
      makerInitials: "SD",
      comments: 3,
      votes: 98,
      color: "#D9289D",
      initial: "S",
      spark: [8, 14, 12, 18, 16, 26, 24, 34],
    }),
    launch(locale, {
      rank: 3,
      name: "MeetingLite",
      taglineKey: "meetinglite",
      categoryKey: "productivity",
      maker: "Luis Builder",
      makerInitials: "LB",
      comments: 2,
      votes: 76,
      color: "#2389E8",
      initial: "M",
      spark: [10, 9, 14, 12, 20, 18, 25, 28],
    }),
    launch(locale, {
      rank: 4,
      name: "APIWatch",
      taglineKey: "apiwatch",
      categoryKey: "devtools",
      maker: "Marco Data",
      makerInitials: "MD",
      comments: 1,
      votes: 61,
      color: "#F97316",
      initial: "A",
      spark: [6, 10, 8, 14, 13, 18, 17, 22],
    }),
    launch(locale, {
      rank: 5,
      name: "PromptShelf",
      taglineKey: "promptshelf",
      categoryKey: "ai",
      maker: "Morgan Mod",
      makerInitials: "MM",
      comments: 0,
      votes: 54,
      color: "#8B5CF6",
      initial: "P",
      spark: [4, 8, 7, 12, 10, 15, 16, 19],
    }),
  ];
}

export function getTopMakers(): TopMaker[] {
  return TOP_MAKERS;
}

export function getRecentActivity(locale: LandingLocale): ActivityItem[] {
  return getActivity(locale);
}

/** Weekly new-votes bars for the "Momento de la comunidad" card. */
export const MOMENTUM_BARS = [14, 22, 18, 30, 26, 38, 34, 46, 40, 52, 58, 66];
export const MOMENTUM_COUNT = 248;
export const MOMENTUM_DELTA_PERCENT = 18;
