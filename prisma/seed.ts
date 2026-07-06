/**
 * Seed data for local development and testing.
 * Run: npm run db:seed
 *
 * Creates: 6 categories, 6 users (1 admin, 1 moderator, 4 members),
 * 9 products in various states, distributed upvotes and comments (a lively
 * leaderboard), sample notifications, one moderation report, and one
 * community link.
 *
 * All demo accounts share the password from SEED_USER_PASSWORD
 * (defaults to "changeme123" — dev only, never use seeds in production).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = process.env.SEED_USER_PASSWORD ?? "changeme123";
  const passwordHash = await bcrypt.hash(password, 12);

  // --- Categories ---------------------------------------------------------
  const categoryData = [
    { name: "AI & Machine Learning", slug: "ai-machine-learning" },
    { name: "Developer Tools", slug: "developer-tools" },
    { name: "Productivity", slug: "productivity" },
    { name: "Education", slug: "education" },
    { name: "Community", slug: "community" },
    { name: "Finance", slug: "finance" },
  ];
  const categories = [];
  for (const c of categoryData) {
    categories.push(
      await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c })
    );
  }

  // --- Users ---------------------------------------------------------------
  const [admin, mod, ana, luis] = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@example.com" },
      update: {},
      create: {
        name: "Admin",
        email: "admin@example.com",
        passwordHash,
        role: "ADMIN",
        bio: "Platform administrator",
      },
    }),
    prisma.user.upsert({
      where: { email: "mod@example.com" },
      update: {},
      create: {
        name: "Morgan Mod",
        email: "mod@example.com",
        passwordHash,
        role: "MODERATOR",
        bio: "Keeping the community healthy",
      },
    }),
    prisma.user.upsert({
      where: { email: "ana@example.com" },
      update: {},
      create: {
        name: "Ana Maker",
        email: "ana@example.com",
        passwordHash,
        bio: "Indie hacker shipping weekly",
      },
    }),
    prisma.user.upsert({
      where: { email: "luis@example.com" },
      update: {},
      create: {
        name: "Luis Builder",
        email: "luis@example.com",
        passwordHash,
        bio: "Full-stack dev and community fan",
      },
    }),
  ]);

  const [sofia, marco] = await Promise.all([
    prisma.user.upsert({
      where: { email: "sofia@example.com" },
      update: {},
      create: {
        name: "Sofía Design",
        email: "sofia@example.com",
        passwordHash,
        bio: "Product designer exploring no-code",
      },
    }),
    prisma.user.upsert({
      where: { email: "marco@example.com" },
      update: {},
      create: {
        name: "Marco Data",
        email: "marco@example.com",
        passwordHash,
        bio: "Data engineer, launch enthusiast",
      },
    }),
  ]);

  // --- Products ------------------------------------------------------------
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);
  const daysAhead = (d: number) => new Date(now.getTime() + d * 86_400_000);

  const productData = [
    {
      makerId: ana.id,
      name: "FocusFlow",
      slug: "focusflow",
      tagline: "Deep-work timer that adapts to your energy",
      description:
        "FocusFlow learns when you do your best work and schedules focus blocks automatically. Integrates with your calendar and blocks distracting sites during sessions.",
      websiteUrl: "https://example.com/focusflow",
      categoryId: categories[2].id,
      launchDate: daysAgo(3),
      status: "LIVE" as const,
    },
    {
      makerId: ana.id,
      name: "PromptShelf",
      slug: "promptshelf",
      tagline: "Organize, version and share your AI prompts",
      description:
        "A library for teams to store prompts with version history, tags and one-click testing against multiple models.",
      websiteUrl: "https://example.com/promptshelf",
      categoryId: categories[0].id,
      launchDate: daysAgo(10),
      status: "LIVE" as const,
    },
    {
      makerId: luis.id,
      name: "SchemaPeek",
      slug: "schemapeek",
      tagline: "Visualize any database schema in seconds",
      description:
        "Point SchemaPeek at a connection string and get an interactive ER diagram, table stats and index suggestions.",
      websiteUrl: "https://example.com/schemapeek",
      categoryId: categories[1].id,
      launchDate: daysAgo(1),
      status: "LIVE" as const,
    },
    {
      makerId: luis.id,
      name: "CourseCraft",
      slug: "coursecraft",
      tagline: "Turn your knowledge into a cohort course",
      description:
        "Everything you need to run a cohort-based course: curriculum builder, live sessions, community and payments.",
      websiteUrl: "https://example.com/coursecraft",
      categoryId: categories[3].id,
      launchDate: daysAhead(7),
      status: "SCHEDULED" as const,
    },
    {
      makerId: ana.id,
      name: "BudgetBee",
      slug: "budgetbee",
      tagline: "Shared budgets for roommates and couples",
      description: "Split expenses, set shared goals and see where the money goes. Draft — not ready yet.",
      websiteUrl: "https://example.com/budgetbee",
      categoryId: categories[5].id,
      launchDate: daysAhead(30),
      status: "DRAFT" as const,
    },
    {
      makerId: sofia.id,
      name: "MeetingLite",
      slug: "meetinglite",
      tagline: "Agendas that keep meetings under 25 minutes",
      description:
        "Shared agendas with per-topic timers, automatic notes and action items sent to Slack. Built for teams tired of hour-long syncs.",
      websiteUrl: "https://example.com/meetinglite",
      categoryId: categories[2].id,
      launchDate: daysAgo(2),
      status: "LIVE" as const,
    },
    {
      makerId: marco.id,
      name: "APIWatch",
      slug: "apiwatch",
      tagline: "Uptime and contract monitoring for your APIs",
      description:
        "Monitors endpoints, validates response schemas against your OpenAPI spec and alerts on breaking changes before your users notice.",
      websiteUrl: "https://example.com/apiwatch",
      categoryId: categories[1].id,
      launchDate: daysAgo(5),
      status: "LIVE" as const,
    },
    {
      makerId: sofia.id,
      name: "LinguaLoop",
      slug: "lingualoop",
      tagline: "Daily 5-minute language practice with real news",
      description:
        "Reads today's headlines at your level, quizzes you on vocabulary and tracks a streak. Spanish, English and Portuguese at launch.",
      websiteUrl: "https://example.com/lingualoop",
      categoryId: categories[3].id,
      launchDate: daysAgo(7),
      status: "LIVE" as const,
    },
    {
      makerId: marco.id,
      name: "CoinPath",
      slug: "coinpath",
      tagline: "Understand where your crypto portfolio drifted",
      description:
        "Connects read-only to your exchanges, explains portfolio drift in plain language and suggests rebalancing scenarios. No keys with withdrawal rights, ever.",
      websiteUrl: "https://example.com/coinpath",
      categoryId: categories[5].id,
      launchDate: daysAgo(12),
      status: "LIVE" as const,
    },
  ];

  const products = [];
  for (const p of productData) {
    products.push(
      await prisma.product.upsert({ where: { slug: p.slug }, update: {}, create: p })
    );
  }

  // --- Upvotes (skipDuplicates keeps the seed idempotent) -------------------
  // Distributed so the leaderboard has a clear, believable spread.
  await prisma.upvote.createMany({
    data: [
      // FocusFlow (5)
      { userId: luis.id, productId: products[0].id },
      { userId: mod.id, productId: products[0].id },
      { userId: admin.id, productId: products[0].id },
      { userId: sofia.id, productId: products[0].id },
      { userId: marco.id, productId: products[0].id },
      // SchemaPeek (4)
      { userId: ana.id, productId: products[2].id },
      { userId: mod.id, productId: products[2].id },
      { userId: sofia.id, productId: products[2].id },
      { userId: admin.id, productId: products[2].id },
      // MeetingLite (3)
      { userId: ana.id, productId: products[5].id },
      { userId: luis.id, productId: products[5].id },
      { userId: marco.id, productId: products[5].id },
      // APIWatch (2)
      { userId: ana.id, productId: products[6].id },
      { userId: sofia.id, productId: products[6].id },
      // PromptShelf (2)
      { userId: luis.id, productId: products[1].id },
      { userId: marco.id, productId: products[1].id },
      // LinguaLoop (1)
      { userId: luis.id, productId: products[7].id },
      // CoinPath (1)
      { userId: ana.id, productId: products[8].id },
    ],
    skipDuplicates: true,
  });

  // --- Comments --------------------------------------------------------------
  const existingComments = await prisma.comment.count();
  if (existingComments === 0) {
    await prisma.comment.createMany({
      data: [
        {
          userId: luis.id,
          productId: products[0].id,
          body: "Congrats on the launch! The adaptive scheduling is a great idea.",
        },
        {
          userId: mod.id,
          productId: products[0].id,
          body: "Been beta testing this for two weeks — genuinely helps.",
        },
        {
          userId: ana.id,
          productId: products[2].id,
          body: "The ER diagrams look super clean. Does it support Postgres views?",
        },
        {
          userId: marco.id,
          productId: products[0].id,
          body: "How does it decide when I'm at my best? Calendar history or manual input?",
        },
        {
          userId: sofia.id,
          productId: products[2].id,
          body: "Tried it on our staging DB — the index suggestions alone are worth it.",
        },
        {
          userId: luis.id,
          productId: products[5].id,
          body: "The per-topic timer changed our standups. Great launch!",
        },
        {
          userId: ana.id,
          productId: products[6].id,
          body: "Schema-contract alerts are something I didn't know I needed.",
        },
        {
          userId: mod.id,
          productId: products[7].id,
          body: "The streak with real news keeps me coming back. Nice touch.",
        },
      ],
    });
  }

  // --- Notifications (sample data for the frontend bell) ----------------------
  const existingNotifications = await prisma.notification.count();
  if (existingNotifications === 0) {
    await prisma.notification.createMany({
      data: [
        { userId: ana.id, actorId: luis.id, type: "UPVOTE", productId: products[0].id },
        { userId: ana.id, actorId: marco.id, type: "COMMENT", productId: products[0].id },
        { userId: luis.id, actorId: sofia.id, type: "UPVOTE", productId: products[2].id },
        { userId: sofia.id, actorId: luis.id, type: "COMMENT", productId: products[5].id },
        { userId: marco.id, actorId: ana.id, type: "UPVOTE", productId: products[6].id },
      ],
    });
  }

  // --- Moderation report (example) -------------------------------------------
  const existingReports = await prisma.moderationReport.count();
  if (existingReports === 0) {
    await prisma.moderationReport.create({
      data: {
        reporterId: luis.id,
        productId: products[1].id,
        reason: "Example report for testing the moderation queue.",
      },
    });
  }

  // --- Community link (extension demo) ----------------------------------------
  await prisma.communityLink.upsert({
    where: {
      submittedById_url: {
        submittedById: ana.id,
        url: "https://www.skool.com/example-community/example-logro-post",
      },
    },
    update: {},
    create: {
      submittedById: ana.id,
      title: "Reached my first 100 users! 🎉",
      url: "https://www.skool.com/example-community/example-logro-post",
      sourcePlatform: "skool",
      type: "logro",
      status: "VERIFIED",
    },
  });

  console.log("Seed complete.");
  console.log(`Demo accounts (password: ${password}):`);
  console.log("  admin@example.com (ADMIN)");
  console.log("  mod@example.com   (MODERATOR)");
  console.log("  ana@example.com   (USER)");
  console.log("  luis@example.com  (USER)");
  console.log("  sofia@example.com (USER)");
  console.log("  marco@example.com (USER)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
