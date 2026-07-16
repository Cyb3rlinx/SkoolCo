/**
 * Integration tests against a real Postgres. They call the actual route
 * handlers (register, upvote, comments, leaderboard, password reset) with
 * real Requests and assert on real DB state.
 *
 * Requirements:
 *   - DATABASE_URL pointing at a migrated test database
 *     (npx prisma migrate deploy). Without it the whole suite is skipped.
 *
 * NextAuth is mocked at the getServerSession boundary — we test OUR
 * authorization logic, not NextAuth itself. Outbound fetch (HIBP) is
 * stubbed to fail so the pwned-check fails open deterministically.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";

type SessionUser = { id: string; role: string; name: string; email: string };
const session: { current: { user: SessionUser } | null } = { current: null };

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(() => Promise.resolve(session.current)),
}));

const HAS_DB = Boolean(process.env.DATABASE_URL);
const uniq = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

describe.skipIf(!HAS_DB)("integration flows", () => {
  let prisma: (typeof import("@/lib/db"))["prisma"];

  beforeAll(async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network disabled in tests")));
    ({ prisma } = await import("@/lib/db"));
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    await prisma.$disconnect();
  });

  function jsonRequest(url: string, method: string, body?: unknown): Request {
    return new Request(url, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  // -------------------------------------------------------------------------
  it("register: creates the user, rejects duplicates", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const email = `reg-${uniq}@example.com`;

    const res = await POST(
      jsonRequest("http://test/api/auth/register", "POST", {
        name: "Integration Tester",
        email,
        password: `Sup3r-unique-${uniq}!`,
      })
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: string; email: string } };
    expect(body.data.email).toBe(email);

    const inDb = await prisma.user.findUnique({ where: { email } });
    expect(inDb).not.toBeNull();
    expect(inDb!.emailVerified).toBeNull(); // pending verification

    // A verification token was minted for the new user.
    const tokens = await prisma.emailVerificationToken.count({
      where: { userId: body.data.id },
    });
    expect(tokens).toBe(1);

    const dup = await POST(
      jsonRequest("http://test/api/auth/register", "POST", {
        name: "Someone Else",
        email,
        password: `Other-pass-${uniq}!`,
      })
    );
    expect(dup.status).toBe(409);
  });

  // -------------------------------------------------------------------------
  it("upvote flow: count, maker notification, leaderboard", async () => {
    const passwordHash = await bcrypt.hash("irrelevant-here", 4);
    const category = await prisma.category.upsert({
      where: { slug: `it-cat-${uniq}` },
      update: {},
      create: { name: `IT Cat ${uniq}`, slug: `it-cat-${uniq}` },
    });
    const maker = await prisma.user.create({
      data: { name: "Maker IT", email: `maker-${uniq}@example.com`, passwordHash },
    });
    const voter = await prisma.user.create({
      data: { name: "Voter IT", email: `voter-${uniq}@example.com`, passwordHash },
    });
    const product = await prisma.product.create({
      data: {
        makerId: maker.id,
        name: `IT Product ${uniq}`,
        slug: `it-product-${uniq}`,
        tagline: "Integration test product",
        description: "Created directly for the upvote integration test.",
        categoryId: category.id,
        launchDate: new Date(),
        status: "LIVE",
      },
    });

    session.current = {
      user: { id: voter.id, role: "USER", name: voter.name, email: voter.email },
    };

    const { POST: upvote } = await import("@/app/api/products/[slug]/upvote/route");
    const res = await upvote(jsonRequest("http://test/upvote", "POST"), {
      params: { slug: product.slug },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { upvoted: boolean; upvoteCount: number } };
    expect(body.data).toEqual({ upvoted: true, upvoteCount: 1 });

    // Idempotent repeat: still one upvote.
    const again = await upvote(jsonRequest("http://test/upvote", "POST"), {
      params: { slug: product.slug },
    });
    expect(((await again.json()) as { data: { upvoteCount: number } }).data.upvoteCount).toBe(1);

    // The maker got exactly one UPVOTE notification (repeat didn't duplicate).
    const notifications = await prisma.notification.findMany({
      where: { userId: maker.id, productId: product.id, type: "UPVOTE" },
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].actorId).toBe(voter.id);

    // Leaderboard: maker appears with launch + upvote credit (10*1 + 2*1 = 12).
    const { GET: leaderboard } = await import("@/app/api/leaderboard/route");
    const lbRes = await leaderboard(new Request("http://test/api/leaderboard?limit=100"));
    const lb = (await lbRes.json()) as {
      data: Array<{ userId: string; score: number; upvotesReceived: number }>;
    };
    const makerEntry = lb.data.find((e) => e.userId === maker.id);
    expect(makerEntry).toBeDefined();
    expect(makerEntry!.upvotesReceived).toBe(1);
    expect(makerEntry!.score).toBe(12);
  });

  // -------------------------------------------------------------------------
  it("comment flow: creates comment and notifies the maker", async () => {
    const passwordHash = await bcrypt.hash("irrelevant-here", 4);
    const category = await prisma.category.upsert({
      where: { slug: `it-cat2-${uniq}` },
      update: {},
      create: { name: `IT Cat2 ${uniq}`, slug: `it-cat2-${uniq}` },
    });
    const maker = await prisma.user.create({
      data: { name: "Maker C", email: `makerc-${uniq}@example.com`, passwordHash },
    });
    const commenter = await prisma.user.create({
      data: { name: "Commenter", email: `commenter-${uniq}@example.com`, passwordHash },
    });
    const product = await prisma.product.create({
      data: {
        makerId: maker.id,
        name: `IT Comment Product ${uniq}`,
        slug: `it-comment-product-${uniq}`,
        tagline: "Comment integration test",
        description: "Created directly for the comment integration test.",
        categoryId: category.id,
        launchDate: new Date(),
        status: "LIVE",
      },
    });

    session.current = {
      user: { id: commenter.id, role: "USER", name: commenter.name, email: commenter.email },
    };

    const { POST: comment } = await import("@/app/api/products/[slug]/comments/route");
    const res = await comment(
      jsonRequest("http://test/comments", "POST", { body: "Great launch! (integration)" }),
      { params: { slug: product.slug } }
    );
    expect(res.status).toBe(201);

    const notif = await prisma.notification.findFirst({
      where: { userId: maker.id, productId: product.id, type: "COMMENT" },
    });
    expect(notif).not.toBeNull();
    expect(notif!.actorId).toBe(commenter.id);
  });

  // -------------------------------------------------------------------------
  it("password reset flow: forgot → reset → old token dies", async () => {
    const oldPassword = `Old-pass-${uniq}!`;
    const newPassword = `New-pass-${uniq}!`;
    const passwordHash = await bcrypt.hash(oldPassword, 4);
    const user = await prisma.user.create({
      data: { name: "Reset IT", email: `reset-${uniq}@example.com`, passwordHash },
    });

    // Capture the dev-mode email log to extract the plaintext token.
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const { POST: forgot } = await import("@/app/api/auth/forgot-password/route");
    const res = await forgot(
      jsonRequest("http://test/forgot", "POST", { email: user.email })
    );
    expect(res.status).toBe(200);

    const logged = infoSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    infoSpy.mockRestore();
    const match = logged.match(/token=([A-Za-z0-9_-]+)/);
    expect(match).not.toBeNull();
    const token = match![1];

    const { POST: reset } = await import("@/app/api/auth/reset-password/route");
    const ok = await reset(
      jsonRequest("http://test/reset", "POST", { token, password: newPassword })
    );
    expect(ok.status).toBe(200);

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await bcrypt.compare(newPassword, updated.passwordHash)).toBe(true);
    expect(await bcrypt.compare(oldPassword, updated.passwordHash)).toBe(false);

    // Single-use: the same token is now rejected.
    const reuse = await reset(
      jsonRequest("http://test/reset", "POST", { token, password: `Again-${uniq}!` })
    );
    expect(reuse.status).toBe(400);
  });

  // -------------------------------------------------------------------------
  it("offer views: suma para no-maker y anónimo, nunca para el maker", async () => {
    const passwordHash = await bcrypt.hash("irrelevant-here", 4);
    const category = await prisma.category.upsert({
      where: { slug: `ov-cat-${uniq}` },
      update: {},
      create: { name: `OV Cat ${uniq}`, slug: `ov-cat-${uniq}` },
    });
    const maker = await prisma.user.create({
      data: { name: "Maker OV", email: `maker-ov-${uniq}@example.com`, passwordHash },
    });
    const viewer = await prisma.user.create({
      data: { name: "Viewer OV", email: `viewer-ov-${uniq}@example.com`, passwordHash },
    });
    const product = await prisma.product.create({
      data: {
        makerId: maker.id,
        name: `OV Product ${uniq}`,
        slug: `ov-product-${uniq}`,
        tagline: "Producto para el test de vistas",
        description: "Creado para el test de integración del contador de vistas.",
        categoryId: category.id,
        launchDate: new Date(),
        status: "LIVE",
        openToOffers: true,
      },
    });

    const { GET: getProduct } = await import("@/app/api/products/[slug]/route");
    const count = async () =>
      (
        await prisma.product.findUniqueOrThrow({
          where: { id: product.id },
          select: { offerViewCount: true },
        })
      ).offerViewCount;

    // Un usuario logueado que no es el maker suma una vista.
    session.current = {
      user: { id: viewer.id, role: "USER", name: viewer.name, email: viewer.email },
    };
    let res = await getProduct(jsonRequest("http://test/p", "GET"), {
      params: { slug: product.slug },
    });
    expect(res.status).toBe(200);
    expect(await count()).toBe(1);
    // La respuesta expone el campo (valor previo al incremento, da igual para la señal).
    const body = (await res.json()) as { data: { offerViewCount: number } };
    expect(typeof body.data.offerViewCount).toBe("number");

    // El maker viendo su propio producto NO suma.
    session.current = {
      user: { id: maker.id, role: "USER", name: maker.name, email: maker.email },
    };
    res = await getProduct(jsonRequest("http://test/p", "GET"), {
      params: { slug: product.slug },
    });
    expect(res.status).toBe(200);
    expect(await count()).toBe(1);

    // Un visitante anónimo suma.
    session.current = null;
    res = await getProduct(jsonRequest("http://test/p", "GET"), {
      params: { slug: product.slug },
    });
    expect(res.status).toBe(200);
    expect(await count()).toBe(2);

    // Con la oferta cerrada, nadie suma.
    await prisma.product.update({
      where: { id: product.id },
      data: { openToOffers: false },
    });
    res = await getProduct(jsonRequest("http://test/p", "GET"), {
      params: { slug: product.slug },
    });
    expect(res.status).toBe(200);
    expect(await count()).toBe(2);
  });

  // -------------------------------------------------------------------------
  it("offer nudge cron: 401 sin secreto, envía una sola vez a quien califica", async () => {
    const passwordHash = await bcrypt.hash("irrelevant-here", 4);
    const category = await prisma.category.upsert({
      where: { slug: `ng-cat-${uniq}` },
      update: {},
      create: { name: `NG Cat ${uniq}`, slug: `ng-cat-${uniq}` },
    });
    const maker = await prisma.user.create({
      data: { name: "Maker NG", email: `maker-ng-${uniq}@example.com`, passwordHash },
    });
    const productData = (suffix: string) => ({
      makerId: maker.id,
      name: `NG ${suffix} ${uniq}`,
      slug: `ng-${suffix}-${uniq}`,
      tagline: "Producto para el test del cron",
      description: "Creado para el test de integración del email de tracción.",
      categoryId: category.id,
      launchDate: new Date(),
      status: "LIVE" as const,
    });
    const hot = await prisma.product.create({ data: productData("hot") }); // 10 votos → califica
    const cold = await prisma.product.create({ data: productData("cold") }); // 9 votos → no

    const voters = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        prisma.user.create({
          data: { name: `Voter NG ${i}`, email: `voter-ng-${i}-${uniq}@example.com`, passwordHash },
        })
      )
    );
    await prisma.upvote.createMany({
      data: voters.map((v) => ({ userId: v.id, productId: hot.id })),
    });
    await prisma.upvote.createMany({
      data: voters.slice(0, 9).map((v) => ({ userId: v.id, productId: cold.id })),
    });

    // Forzar modo determinista: auth exigida y emails solo-log (sin red).
    const prevSecret = process.env.CRON_SECRET;
    const prevResend = process.env.RESEND_API_KEY;
    process.env.CRON_SECRET = `it-cron-${uniq}`;
    delete process.env.RESEND_API_KEY;
    try {
      const { GET: cron } = await import("@/app/api/cron/offer-nudge/route");

      // Sin header de autorización → 401.
      const denied = await cron(new Request("http://test/api/cron/offer-nudge"));
      expect(denied.status).toBe(401);
      expect((await prisma.product.findUniqueOrThrow({
        where: { id: hot.id },
        select: { offerNudgeSentAt: true },
      })).offerNudgeSentAt).toBeNull();

      // Autorizado → envía y marca al que califica.
      const authed = () =>
        cron(
          new Request("http://test/api/cron/offer-nudge", {
            headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
          })
        );
      const res = await authed();
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { checked: number; sent: number } };
      // >= 1 y no === 1: la base local puede tener otros productos con tracción
      // (seeds); lo que este test garantiza es hot sí / cold no.
      expect(body.data.sent).toBeGreaterThanOrEqual(1);

      const hotAfter = await prisma.product.findUniqueOrThrow({
        where: { id: hot.id },
        select: { offerNudgeSentAt: true },
      });
      expect(hotAfter.offerNudgeSentAt).not.toBeNull();
      const coldAfter = await prisma.product.findUniqueOrThrow({
        where: { id: cold.id },
        select: { offerNudgeSentAt: true },
      });
      expect(coldAfter.offerNudgeSentAt).toBeNull();

      // Idempotente: la segunda corrida no reenvía nada.
      const again = await authed();
      const body2 = (await again.json()) as { data: { checked: number; sent: number } };
      expect(body2.data.sent).toBe(0);
    } finally {
      if (prevSecret === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = prevSecret;
      if (prevResend !== undefined) process.env.RESEND_API_KEY = prevResend;
    }
  });

  // -------------------------------------------------------------------------
  it("suspensión: bloquea acciones autenticadas y la reactivación las restaura", async () => {
    const passwordHash = await bcrypt.hash("irrelevant-here", 4);
    const category = await prisma.category.upsert({
      where: { slug: `susp-cat-${uniq}` },
      update: {},
      create: { name: `Susp Cat ${uniq}`, slug: `susp-cat-${uniq}` },
    });
    const maker = await prisma.user.create({
      data: { name: "Maker Susp", email: `maker-susp-${uniq}@example.com`, passwordHash },
    });
    const voter = await prisma.user.create({
      data: { name: "Voter Susp", email: `voter-susp-${uniq}@example.com`, passwordHash },
    });
    const product = await prisma.product.create({
      data: {
        makerId: maker.id,
        name: `Susp Product ${uniq}`,
        slug: `susp-product-${uniq}`,
        tagline: "Producto para el test de suspensión",
        description: "Creado para el test de integración de suspensión.",
        categoryId: category.id,
        launchDate: new Date(),
        status: "LIVE",
      },
    });

    session.current = {
      user: { id: voter.id, role: "USER", name: voter.name, email: voter.email },
    };
    const { POST: upvote } = await import("@/app/api/products/[slug]/upvote/route");

    // Sin suspender: la acción funciona.
    let res = await upvote(jsonRequest("http://test/upvote", "POST"), {
      params: { slug: product.slug },
    });
    expect(res.status).toBe(200);

    // Suspendido: 403 con el mensaje exacto.
    await prisma.user.update({ where: { id: voter.id }, data: { suspendedAt: new Date() } });
    res = await upvote(jsonRequest("http://test/upvote", "POST"), {
      params: { slug: product.slug },
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe("Tu cuenta está suspendida.");

    // Reactivado: vuelve a funcionar.
    await prisma.user.update({ where: { id: voter.id }, data: { suspendedAt: null } });
    res = await upvote(jsonRequest("http://test/upvote", "POST"), {
      params: { slug: product.slug },
    });
    expect(res.status).toBe(200);
  });
});
