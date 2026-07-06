# 🤝 Handoff #2 — Backend endurecido + Extensión "Logros"

**Fecha:** 5 de julio de 2026
**Repo:** https://github.com/Cyb3rlinx/SkoolCo
**Sigue a:** `docs/HANDOFF.md` (el del backend MVP). Todo lo de ese documento sigue vigente; esto cubre lo NUEVO.

---

## 1. Resumen en 30 segundos

Desde el handoff anterior el backend pasó de "MVP funcional" a "listo para
integrar y operar": seguridad reforzada, tests automáticos en CI, contrato
OpenAPI navegable, notificaciones, búsqueda, y la **extensión Chrome v1**
ya construida. Todo está en `main` con el CI en verde (2 jobs).

## 2. Qué hay de nuevo

### Seguridad (sin que tengas que hacer nada)
- **Login con rate limit** (5/15min por email + 20/15min por IP) — anti fuerza bruta.
- **Contraseñas verificadas contra filtraciones** (HaveIBeenPwned, k-anonymity) en registro y reset.
- **Headers de seguridad** en todas las respuestas (anti-clickjacking, nosniff, HSTS).
- **CORS cerrado por defecto** — solo se abre a la extensión vía env var.

### Features nuevas de API (contrato completo en `/api/docs`)
| Qué | Endpoints |
|---|---|
| Reset de contraseña | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| Verificación de email | `POST /api/auth/verify-email`, `POST /api/auth/resend-verification` (no bloquea login — el campo `emailVerified` queda para gatear después) |
| Notificaciones in-app | `GET /api/notifications` (con `unreadCount` para el badge 🔔), `PATCH /api/notifications/read` — se crean solas al recibir upvote/comentario |
| Búsqueda | `GET /api/products?q=texto` |
| Borrado de cuenta | `DELETE /api/me` (pide contraseña en el body) |
| Auditoría de moderación | `resolvedAt` + `resolvedBy` en la cola de reports |
| Healthcheck | `GET /api/health` |

### Para tu día a día
- **📖 Docs interactivas:** levanta el server y abre `http://localhost:3000/api/docs` — Swagger UI con los 31 endpoints, bodies, respuestas y errores. **Empieza por ahí.**
- **Seed rico:** `npm run db:seed` → 6 usuarios, 9 productos, upvotes/comentarios/notificaciones — el frontend tiene datos lindos desde el minuto uno. Cuentas demo: `ana@example.com` etc., contraseña `changeme123`.
- **CI:** cada push/PR corre typecheck + 22 tests unitarios + 4 tests de integración contra Postgres real + build de la extensión. Si rompes algo, el CI te avisa antes que un usuario.

### Extensión Chrome "Logros" (v1 completa, en `extension/`)
Popup con 2 pestañas: **Enviar** (detecta el post de Skool activo, título editable, tipo) y **Mis links** (estado: pendiente/verificado/rechazado). Usa la misma sesión del sitio — sin tokens aparte. Instalación y checklist de smoke en `extension/README.md`.

## 3. Cómo actualizarte (2 minutos)

```bash
git pull
npm install          # deps nuevas (vitest)
npm run db:migrate   # 3 migraciones nuevas: tokens de auth, resolvedAt, notifications
npm run db:seed      # opcional pero recomendado
npm run dev          # → http://localhost:3000/api/docs
```

## 4. Variables de entorno nuevas (todas opcionales hoy)

| Variable | Para qué | Sin ella |
|---|---|---|
| `RESEND_API_KEY` + `EMAIL_FROM` | Emails reales de reset/verificación | Los emails se loguean en la consola del server (suficiente para dev) |
| `APP_URL` | Base de los links en los emails | Usa `http://localhost:3000` |
| `ALLOWED_EXTENSION_ORIGINS` | CORS para la extensión (`chrome-extension://<id>`) | La extensión no puede llamar a la API |

## 5. Decisiones que tomamos (para que no re-litigues)

- **Rate limiter en memoria** — válido porque corremos un solo server Node. Si algún día vamos a Vercel/serverless, se cambia a Upstash Redis (solo se toca `src/lib/rate-limit.ts`).
- **Búsqueda con `contains`** (sin tsvector) — suficiente para el volumen actual; migramos a full-text si el catálogo crece a miles.
- **Email verificado NO bloquea login** — decisión de producto pendiente de validar con usuarios; el dato ya se guarda.
- **Notificaciones sin colas ni emails** — inline en el request, best-effort. MVP.

## 6. Qué falta (y de quién es)

- **Frontend** ← tuyo. Todo lo que necesitas está en `/api/docs`.
- **Deploy + DB gestionada** ← pendiente de decidir juntos (Willy tiene Supabase a mano).
- **Páginas `/reset-password` y `/verify-email`** ← frontend (los endpoints ya existen; los emails linkean a esas rutas).
- **Publicar la extensión en Web Store** ← cuando haya deploy real.

**Regla de oro (sigue siendo la misma):** frontend conectado + 5–10 personas reales de la comunidad usándolo. Ellas dictan la tanda 3.
