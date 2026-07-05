# LaunchPad — Backend MVP

Community-powered product launch platform: creators submit projects, members discover launches, upvote, comment, and build credibility. Inspired at a high level by community launch platforms; no third-party branding, content, or proprietary functionality is copied.

## Stack

- **Next.js 14** (App Router, REST API routes)
- **TypeScript** (strict)
- **PostgreSQL** (works with Supabase — see `.env.example`)
- **Prisma** ORM + SQL migrations
- **NextAuth** (email + password credentials, JWT sessions, role claims)
- **Zod** input validation on every write endpoint

## Getting started

```bash
cp .env.example .env      # fill in DATABASE_URL and NEXTAUTH_SECRET
npm install
npm run db:generate       # generate Prisma client
npm run db:deploy         # apply migrations (or db:migrate in dev)
npm run db:seed           # demo categories, users, products
npm run dev               # http://localhost:3000
```

Seeded demo accounts (password `changeme123`, override with `SEED_USER_PASSWORD`):
`admin@example.com` (ADMIN) · `mod@example.com` (MODERATOR) · `ana@example.com`, `luis@example.com` (USER).

## Database schema

| Table | Purpose |
|---|---|
| `users` | Accounts. `role`: USER / MODERATOR / ADMIN. Passwords bcrypt-hashed. |
| `categories` | Product categories (name + slug). |
| `products` | Launches. `status`: DRAFT / SCHEDULED / LIVE / ARCHIVED. Unique `slug` for detail pages. |
| `upvotes` | One row per vote. **Unique `(user_id, product_id)`** — duplicates impossible at the DB level. |
| `comments` | Soft-deleted via `deleted_at` to keep a moderation trail. |
| `moderation_reports` | User reports against a product *or* comment, with status workflow. |
| `leaderboard_entries` | **SQL view** (not a table): computed live, never stale. |
| `community_links` | Manually submitted public Skool "Logros" links (extension support). |
| `extension_events` | First-party audit log of explicit extension actions. |

**Leaderboard score** = live launches ×10 + upvotes received ×2 + comments written ×1. Tune the weights in `prisma/migrations/20260705000002_leaderboard_view/migration.sql`.

## API contract

All responses: `{ data: … }` on success, `{ error: { message, details? } }` on failure. Auth via NextAuth session cookie.

### Auth & profile
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create account `{ name, email, password }` |
| * | `/api/auth/[...nextauth]` | — | NextAuth sign-in/sign-out/session |
| GET | `/api/me` | user | Current profile + counts |
| PATCH | `/api/me` | user | Update `name`, `bio`, `avatarUrl` |

### Products
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/products` | — | List. Query: `status`, `category` (slug), `sort=newest|top|launching`, `page`, `pageSize`. Anonymous = LIVE only; drafts visible only to their maker or staff. |
| POST | `/api/products` | user | Submit a launch. Slug auto-generated, collision-safe. |
| GET | `/api/products/:slug` | — | Detail (accepts slug **or** id) + `upvotedByMe`. |
| PATCH | `/api/products/:slug` | maker/staff | Update fields or status. |
| DELETE | `/api/products/:slug` | maker/staff | Archive (soft delete). |
| GET | `/api/categories` | — | Categories with live-product counts. |

### Engagement
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/products/:id/upvote` | user | Upvote (idempotent; unique constraint prevents duplicates). LIVE products only. |
| DELETE | `/api/products/:id/upvote` | user | Remove your upvote (idempotent). |
| GET | `/api/products/:id/comments` | — | Paginated comments, newest first. |
| POST | `/api/products/:id/comments` | user | Add comment (1–2000 chars). |
| DELETE | `/api/comments/:id` | owner/staff | Soft-delete a comment. |
| GET | `/api/leaderboard?limit=25` | — | Ranked members from the SQL view. |

### Moderation
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/reports` | user | Report a product or comment `{ productId|commentId, reason }`. |
| GET | `/api/reports?status=OPEN` | mod/admin | Moderation queue. |
| PATCH | `/api/reports/:id` | mod/admin | Set REVIEWING / RESOLVED / DISMISSED. |

### Extension support (Skool "Logros")
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/community-links` | — | VERIFIED links. `?mine=1` (auth) lists your own incl. pending. |
| POST | `/api/community-links` | user | Manually submit a public `https://…skool.com` link. |
| PATCH | `/api/community-links/:id` | mod/admin | Human verify/reject. |
| DELETE | `/api/community-links/:id` | owner/staff | Remove a link. |
| POST | `/api/extension/events` | user | Log an explicit extension action (own account only). |

## Extension safety model

The extension backend is **safe by construction**, not by policy alone:

1. **Explicit action only** — every write requires a signed-in platform session and a deliberate submission; there is no background capture path.
2. **No automation possible** — no endpoint exists that upvotes, posts, or performs *any* action on Skool. Auto-upvoting and bulk-upvoting cannot be built on this API.
3. **No Skool credentials** — the schema has no field for third-party tokens, cookies, or passwords, and the server never authenticates to Skool.
4. **No scraping** — the backend never fetches Skool URLs; it stores only the title + public URL the user typed/clicked. URL validation restricts submissions to `https://…skool.com`.
5. **Consent & control** — users see and can delete everything they submitted (`?mine=1`, DELETE). Links go public only after human moderator verification.
6. **Abuse limits** — per-user rate limits plus a unique `(user, url)` constraint.

## Abuse protection

Sliding-window rate limits (see `src/lib/rate-limit.ts`): upvotes 30/min, comments 10/min, product submissions 5/h, reports 10/h, link submissions 10/h, signups 5/h/IP. In-memory — swap the store for Upstash Redis (`@upstash/ratelimit`) when deploying serverless/multi-instance; only that module changes.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL/Supabase connection string |
| `NEXTAUTH_SECRET` | ✅ | JWT signing secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | ✅ | Canonical app URL |
| `SEED_USER_PASSWORD` | — | Dev-only seed account password |

No secrets are hardcoded anywhere in the codebase.

## Project layout

```
prisma/
  schema.prisma                  # all entities
  migrations/                    # init tables + leaderboard view
  seed.ts                        # demo data
src/
  lib/
    db.ts                        # Prisma singleton
    auth.ts                      # NextAuth config, requireUser/requireModerator
    validation.ts                # Zod schemas + slugify
    rate-limit.ts                # sliding-window limiter
    api.ts                       # response helpers + error wrapper
    products.ts                  # slug generation, shared selects
    leaderboard.ts               # view query
  app/
    api/…                        # all route handlers (see contract above)
    layout.tsx, page.tsx         # minimal placeholders — frontend owns design
  types/next-auth.d.ts           # session typing (id + role)
```

## Frontend integration notes

- Call `signIn("credentials", { email, password })` from `next-auth/react`; session includes `user.id` and `user.role`.
- Product detail pages route by **slug** (`/products/[slug]` → `GET /api/products/:slug`).
- `GET /api/products/:slug` returns `upvotedByMe` so the vote button can render correct initial state.
- All list endpoints are paginated (`page`, `pageSize`, `totalPages`).
