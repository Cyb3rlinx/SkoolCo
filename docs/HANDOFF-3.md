# 🤝 Handoff #3 — Estado completo del proyecto

**Fecha:** 6 de julio de 2026
**Repo:** https://github.com/Cyb3rlinx/SkoolCo (mirror privado de respaldo bajo la cuenta de Willy)
**Anteriores:** `docs/HANDOFF.md` (MVP backend) · `docs/HANDOFF-2.md` (hardening + features). Este documento es la foto COMPLETA de hoy — si solo vas a leer uno, lee este.

---

## 1. Qué es el proyecto

Plataforma comunitaria de lanzamiento de productos (estilo Product Hunt):
registro → publicar productos → descubrir → upvotes → comentarios →
leaderboard → notificaciones. Más una **extensión Chrome** para compartir
logros de comunidades (Skool, Discord, YouTube y 6 plataformas más) con
verificación por moderador.

**La plataforma es para cualquier usuario** — Skool solo aplica al feature
de links de logros, que acepta 9 plataformas (allowlist).

## 2. Estado por componente

| Componente | Estado | Detalle |
|---|---|---|
| **Backend API** | ✅ Completo y endurecido | 31 operaciones · Next.js 14 + Prisma + Postgres 16 |
| **Seguridad** | ✅ | Rate limit login (email+IP) · HIBP · tokens hasheados 1h single-use · anti-enumeración · security headers · CORS deny-by-default |
| **Features** | ✅ | Auth completo (registro/login/reset/verificación) · productos · upvotes · comentarios · leaderboard · notificaciones in-app · búsqueda `?q=` · borrado de cuenta · moderación con auditoría |
| **Multi-plataforma** | ✅ | Community links aceptan: Skool, Discord, YouTube, X, Facebook, LinkedIn, Instagram, Telegram, Circle. Fuente única: `src/lib/platforms.ts` (backend + extensión) |
| **Docs de API** | ✅ | OpenAPI 3.0 (v0.3.0) → Swagger UI en `/api/docs` |
| **Tests** | ✅ | 24 unit backend + 4 integración (Postgres real) + 9 extensión = **37 en CI** |
| **CI** | ✅ Verde | 2 jobs en GitHub Actions: backend (con service container de Postgres) + extensión |
| **Extensión Chrome** | ✅ v0.2.0 | MV3, popup Enviar/Mis links, URL de backend configurable sin recompilar. Carga local dev (`extension/README.md`) |
| **Seed demo** | ✅ | 6 usuarios, 9 productos, upvotes/comentarios/notificaciones. Password `changeme123` (SOLO dev) |
| **Plan de deploy** | ✅ Escrito | `docs/DEPLOY-PLAN.md` — Render + Postgres gestionado, fase por fase con comandos. El único cambio de código que pedía (`engines`) ya está hecho |
| **Frontend** | ❌ **NO EXISTE en el repo** | Es EL bloqueador. Ver sección 4 |
| **Deploy** | ⏳ No ejecutado | Bloqueado por 2 decisiones: dominio real + Render PG vs Neon |

## 3. Cómo levantar todo (dev)

```bash
git clone https://github.com/Cyb3rlinx/SkoolCo.git && cd SkoolCo
npm install
cp .env.example .env        # llenar DATABASE_URL y NEXTAUTH_SECRET (openssl rand -base64 32)
npm run db:migrate          # 6 migraciones
npm run db:seed             # datos demo
npm run dev                 # → http://localhost:3000
```

- **Docs de la API:** http://localhost:3000/api/docs ← empezar por aquí
- **Health:** http://localhost:3000/api/health
- **Cuentas demo:** `ana@example.com` / `changeme123` (también admin@, mod@, luis@, sofia@, marco@)
- **Extensión:** `cd extension && npm install && npm run build` → cargar `extension/dist` descomprimida → poner el ID en `ALLOWED_EXTENSION_ORIGINS` del `.env` (pasos exactos en `extension/README.md`)

## 4. EL bloqueador: frontend

No hay UI en el repo (se buscó en ramas, PRs y archivos — no está). Sin
frontend no hay demo, ni usuarios, ni feedback. Lo que el frontend necesita
ya está listo del lado del backend:

- Contrato completo en `/api/docs` (bodies, respuestas, errores, auth)
- Sesión: NextAuth con credentials — `signIn()`/`signOut()` del cliente, la
  cookie hace el resto; `GET /api/me` para el usuario actual
- Datos demo poblados para desarrollar con contenido real
- Páginas requeridas por los flujos de email (los links ya apuntan ahí):
  `/reset-password?token=…` y `/verify-email?token=…`
- Convención de respuestas: `{ data: … }` / `{ error: { message } }`

**Para subir el frontend sin tocar `main`:**
```bash
git checkout -b frontend
git add . && git commit -m "frontend: primera versión"
git push origin frontend
```

## 5. Pendientes y dueños

| Pendiente | Dueño |
|---|---|
| Frontend (+ páginas reset/verify) | Cofounder |
| Decidir dominio + Render PG vs Neon → ejecutar `docs/DEPLOY-PLAN.md` | Willy |
| Resend (SPF/DKIM) — al tener dominio | Willy |
| Protección de rama `main` (require PR + CI verde) | Cyb3rlinx (dueño del repo) |
| Chrome Web Store (íconos + privacy policy) — solo al publicar | Willy, post-deploy |
| 5–10 usuarios reales de la comunidad | Ambos — la regla de oro |

## 6. Decisiones tomadas (no re-litigar sin razón nueva)

- 1 instancia Node + rate limiter en memoria → Redis SOLO antes de escalar
  horizontalmente (triggers medibles en `DEPLOY-PLAN.md` fase 12)
- Búsqueda con `contains` → tsvector a >5k productos
- Email verificado no bloquea login (dato guardado, gate de producto pendiente)
- Links de logros: allowlist de 9 plataformas, JAMÁS "cualquier URL"
  (protege la cola de moderación) — agregar plataforma = 1 línea en
  `src/lib/platforms.ts` + rebuild de la extensión
- Render como plataforma de deploy (no Vercel/AWS/K8s en esta etapa)

## 7. Mapa de documentos

| Doc | Qué tiene |
|---|---|
| `docs/HANDOFF.md` | El MVP original (contexto histórico) |
| `docs/HANDOFF-2.md` | Hardening + features (detalle técnico de esa tanda) |
| **`docs/HANDOFF-3.md`** | **Este — la foto completa actual** |
| `docs/DEPLOY-PLAN.md` | Deploy a Render fase por fase, comandos, checklist de 25 pruebas, bloqueadores |
| `extension/README.md` | Instalar/probar la extensión + smoke checklist |
| `docs/superpowers/specs/` y `plans/` | Diseños y planes de cada tanda (trazabilidad) |
| `/api/docs` (corriendo) | Contrato vivo de la API |
