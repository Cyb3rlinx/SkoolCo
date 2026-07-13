# SkoolCo — Denveler

Community-powered product launch platform: creators submit projects, members discover launches, upvote, comment, and build credibility. Two pieces live here — the full-stack web app and its companion browser extension — plus the shared handoff docs. No third-party branding, content, or proprietary functionality is copied.

## Repository structure

```
SkoolCo/
├── launchpad/      # ⭐ The web app — Next.js full-stack (backend API + frontend)
├── extension/      # "Logros" browser extension (Chrome MV3), separate package
├── docs/           # Handoffs & API spec (HANDOFF, HANDOFF-2, HANDOFF-3, openapi)
└── .github/        # CI (typecheck + unit/integration tests + extension build)
```

- **`launchpad/`** is the product: the REST API (`src/app/api/**`) and the frontend
  (pages + `src/components`) are one integrated Next.js app with a single
  `package.json`. Start here → [`launchpad/README.md`](launchpad/README.md).
- **`extension/`** is an independent MV3 extension with its own `package.json` and
  build. Install/dev instructions → [`extension/README.md`](extension/README.md).
- **`docs/`** holds the three handoffs (backend MVP → hardening + extension →
  frontend) and `openapi.yaml`.

## Quickstart (web app)

```bash
cd launchpad
cp .env.example .env      # fill in DATABASE_URL and NEXTAUTH_SECRET
npm install
npm run db:generate
npm run db:deploy         # apply migrations (or db:migrate in dev)
npm run db:seed           # demo categories, users, products
npm run dev               # → http://localhost:3000  (API docs at /api/docs)
```

> **No database yet?** The frontend still runs: read-only views fall back to mock
> data (mirroring the seed) and show a "datos de demo" badge, so you can browse the
> whole UI before wiring up Postgres. Disable with `NEXT_PUBLIC_DEMO_FALLBACK=false`.

Seeded demo accounts (password `changeme123`): `admin@example.com` (ADMIN),
`mod@example.com` (MODERATOR), `ana@example.com` / `luis@example.com` (USER).

## Handoffs

| Doc | Scope |
|---|---|
| [`docs/HANDOFF.md`](docs/HANDOFF.md) | Backend MVP |
| [`docs/HANDOFF-2.md`](docs/HANDOFF-2.md) | Backend hardening + Chrome extension |
| [`docs/HANDOFF-3-frontend.md`](docs/HANDOFF-3-frontend.md) | Frontend MVP wired to the API |

## CI

`.github/workflows/ci.yml` runs on every push/PR: the **test** job (typecheck +
unit + integration tests against a real Postgres) runs in `launchpad/`, and the
**extension** job builds `extension/`.
