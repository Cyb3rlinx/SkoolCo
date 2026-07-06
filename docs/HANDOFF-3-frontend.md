# 🤝 Handoff #3 — Frontend MVP conectado

**Fecha:** 6 de julio de 2026
**Repo:** https://github.com/Cyb3rlinx/SkoolCo
**Sigue a:** `docs/HANDOFF-2.md` (backend endurecido + extensión). Todo lo de ese
documento sigue vigente; esto cubre el **frontend**, que era la pieza que faltaba.

---

## 1. Resumen en 30 segundos

El backend ya estaba "listo para integrar". Ahora tiene cara: un frontend
completo en Next.js + Tailwind, con las 9 páginas del MVP, conectado a los 31
endpoints reales vía un cliente tipado. `npm run typecheck` y `npm run build`
pasan en verde (30 rutas). Y lo mejor para hacer demo: **si no hay base de
datos levantada, la UI sigue funcionando** con datos de demo que calcan el seed.

**Regla de oro (la misma de siempre):** frontend conectado + 5–10 personas
reales de la comunidad usándolo. Ellas dictan la tanda 4.

## 2. Qué hay de nuevo (páginas)

| Ruta | Qué es | Datos |
|---|---|---|
| `/` | Landing: hero, cómo funciona, destacados, teaser de extensión, CTAs duales | `GET /api/products`, `/api/leaderboard` |
| `/launches` | Lanzamientos con tabs (Hoy / Semana / Todos), búsqueda, filtro por categoría y orden | `GET /api/products`, `/api/categories` |
| `/products/[slug]` | Detalle: galería, descripción, maker, fecha, upvote, comentarios, relacionados, reportar | `GET /api/products/:slug` + comments + upvote |
| `/submit` | Formulario de publicación con **vista previa en vivo** de la tarjeta (auth-gated) | `POST /api/products` |
| `/profile` | Perfil propio: stats, mis lanzamientos (todos los estados), editar, borrar cuenta | `GET/PATCH/DELETE /api/me`, `GET /api/products` |
| `/leaderboard` | Ranking con podio + tabla | `GET /api/leaderboard` |
| `/login`, `/signup` | Auth por credenciales (NextAuth) | `signIn()`, `POST /api/auth/register` |
| `/forgot-password`, `/reset-password`, `/verify-email` | Las páginas que el handoff #2 dejó pendientes — ya linkean con los emails | endpoints `/api/auth/*` |
| `/admin` | Consola de moderación (role-gated): cola de reportes + verificación de logros | `GET/PATCH /api/reports`, `PATCH /api/community-links/:id` |
| `/extension` | Landing de la extensión: mockup interactivo del popup, modelo de seguridad Nunca/Siempre, muro de Logros | `GET /api/community-links` |

Extras: `not-found.tsx` (404 con marca), header con **campana de notificaciones**
(usa `unreadCount` para el badge 🔔) y menú de usuario, footer, favicon SVG.

## 3. Cómo se ve / cómo probarlo (2 minutos)

```bash
git pull
cd launchpad         # ⚠️ la app ahora vive en launchpad/ (ver README raíz)
npm install          # deps nuevas: tailwindcss, lucide-react, clsx, cva, tailwind-merge
npm run dev          # → http://localhost:3000
```

- **Con base de datos** (`npm run db:seed` primero): todo sale de la API real.
- **Sin base de datos**: la UI cae a datos de demo y muestra un badge naranja
  "Datos de demo — la API no está disponible". Ideal para enseñarle la UI a
  alguien sin montar Postgres. Se apaga con `NEXT_PUBLIC_DEMO_FALLBACK=false`.

Recorrido sugerido: `/` → clic en un producto → `/launches` (cambia a "Todos"
y busca) → `/extension` (juega con el popup mock) → entra con `ana@example.com`
(`changeme123`) → `/submit` (mira la preview en vivo) → `/profile`.

## 4. Cómo está armado (para que sepas dónde tocar)

```
src/
  lib/frontend/
    types.ts         # DTOs que calcan las respuestas de la API (1 sitio para actualizar)
    api-client.ts    # ⭐ UNA función por endpoint. Toda la integración vive aquí.
    hooks.ts         # useApi (loading/error/empty/demo) y useMutation
    mock-data.ts     # datos de demo espejo del seed
    format.ts, utils.ts
  components/
    ui/              # button, card, dialog, input, badge, avatar, tabs, states…
    layout/          # header, footer, notifications-bell, user-menu, auth-gate
    product/         # product-card, upvote-button, comment-section, gallery, related…
    forms/           # submit-launch, login, signup, reset, profile
    extension/       # extension-popup-mock, logros-wall
  app/               # una carpeta por ruta (client components donde hace falta sesión/estado)
```

**La regla mental:** ¿cambió un endpoint del backend? Toca `types.ts` y
`api-client.ts`. Nada más. Los componentes solo importan de ahí.

## 5. Decisiones que tomé (para que no re-litigues)

- **Sin librería de fetching (React Query, SWR)** — un hook propio `useApi` de
  ~80 líneas cubre el MVP sin sumar dependencias. Si el estado se complica
  (caché compartida, revalidación), migrar a React Query es directo porque todo
  pasa por `api-client.ts`.
- **Componentes propios en vez de instalar shadcn/ui completo** — mismos
  patrones (cva + tailwind-merge), cero peso muerto, control total del estilo.
- **Identidad visual violeta→índigo**, deliberadamente lejos del naranja/rojo de
  las plataformas de referencia. Nada de su marca, copy ni assets fue copiado.
- **Modo demo con fallback a mock** — para que la UI sea mostrable el minuto uno,
  incluso sin DB. Solo aplica a lecturas; las mutaciones muestran el error real.
- **Subida de imágenes = URL por ahora** — no hay storage en el backend todavía.
  El input de archivo genera preview local; el valor que se envía es una URL
  pública. Marcado con `TODO(backend)`.
- **Gate de rutas en el cliente** (`AuthGate`) es solo UX; la seguridad real la
  siguen poniendo `requireUser`/`requireModerator` en la API.

## 6. Qué falta (y de quién es)

**Frontend, cuando el backend habilite estas piezas** (todas marcadas con
`TODO(backend)` en el código):

- **Subida real de imágenes** (logo de producto, avatar) — hoy es URL. Necesita
  un endpoint de storage (S3/Supabase Storage) que devuelva la URL.
- **`GET /api/products?maker=me`** — el perfil hoy junta 4 llamadas y filtra en
  cliente. Un filtro por maker lo colapsa a una.
- **`GET /api/community-links?status=PENDING`** (staff) — no existe endpoint para
  que un moderador liste logros pendientes; la cola de `/admin` usa el mock para
  esa lista. El verificar/rechazar sí pega al `PATCH` real.
- **Galería de producto** — el schema solo guarda `logoUrl`. La galería del
  detalle son placeholders con marca hasta que haya un endpoint de screenshots.
- **Perfil público de maker** — no hay `GET /api/users/:id`; la maker-card no
  enlaza a un perfil público todavía.

**Producto / conjunto (a decidir juntos):**

- **Deploy + DB gestionada** ← sigue pendiente (Willy tiene Supabase a mano).
- **`emailVerified` no bloquea nada** ← el dato se guarda y la página de verificar
  existe; falta la decisión de producto de si/cuándo gatear features con eso.

## 7. Verificación

- `npm run typecheck` → limpio.
- `npm run build` → 30 rutas generadas (las mismas 9 páginas MVP + auth + admin + API).
- QA manual en navegador: desktop, tablet y **mobile** (nav hamburguesa, hero
  apilado, tarjetas responsive). Estados de carga (skeletons), vacío (prompts) y
  error/demo (badge naranja) verificados en vivo con la DB apagada.
- El CI del handoff #2 (typecheck + tests + build de extensión) sigue en verde:
  no toqué backend, tests ni la extensión.
