# Plan de Deploy — LaunchPad Backend (Render + Postgres gestionado)

**Fecha:** 6 de julio de 2026
**Para:** el desarrollador que ejecute el deploy
**Basado en:** el código real de este repo (no en suposiciones). Donde falta una decisión está marcado **[PENDIENTE DE CONFIRMAR]**.

**Arquitectura objetivo (decidida, no re-litigar):**
Render Web Service (Node, 1 instancia) · Postgres gestionado (Render PG o Neon) · Cloudflare solo DNS · Resend para email · Sentry para errores · UptimeRobot/Better Stack sobre `/api/health` · SIN Vercel/AWS/K8s/Workers en esta etapa.

**Por qué 1 instancia Node y no serverless:** el rate limiter vive en memoria (`src/lib/rate-limit.ts`). Con más de un proceso, cada instancia lleva su propia cuenta y los límites reales se multiplican. Es deuda aceptada para el MVP; se migra a Upstash Redis ANTES de escalar horizontalmente (sección 12).

---

## FASE 0 — Revisión previa del repo (30 min)

### 0.1 Archivos a revisar (existen todos; verificar contenido)

| Archivo | Qué verificar |
|---|---|
| `package.json` | Scripts listados abajo. **Falta `engines`** → agregarlo (ver 0.3) |
| `prisma/schema.prisma` | `provider = "postgresql"`, sin `directUrl` (solo importa si eligen Neon, ver 3.B) |
| `prisma/migrations/` | 6 migraciones. Nota: `0001_init/migration.sql` está **vacía** — es inofensiva, `migrate deploy` la aplica sin efecto. NO borrarla (cambiaría el historial de migraciones) |
| `src/middleware.ts` | CORS deny-by-default + security headers. No requiere cambios para deploy |
| `src/lib/email.ts` | Resend por HTTP con `RESEND_API_KEY`; sin la key loguea a consola. Ya listo |
| `src/app/api/health/route.ts` | `force-dynamic`, devuelve 200/503 con ping a DB. Ya listo |
| `next.config.mjs` | Minimal. Verificar que no tenga `output: "export"` ni nada raro (no debería) |
| `.env.example` | Referencia de variables (el bloque de email/CORS está documentado en README sección "Environment variables") |
| `extension/manifest.json` | `host_permissions` solo localhost — correcto para dev; cambios para prod en sección 7 |

### 0.2 Comandos a correr localmente (todos deben pasar)

```bash
npm ci
npx prisma generate
npm run typecheck        # debe salir limpio
npm test                 # 22 tests unitarios
npm run build            # build de Next sin warnings de prerender

# Con un Postgres local disponible:
DATABASE_URL="postgresql://<user>@localhost:5432/launchpad_test" npx prisma migrate deploy
DATABASE_URL="postgresql://<user>@localhost:5432/launchpad_test" npm run test:integration   # 4 tests

# Extensión:
cd extension && npm ci && npm run typecheck && npm test && npm run build
```

Si algo de esto falla, **no seguir**: el CI de GitHub corre exactamente esto y está en verde — un fallo local es problema de entorno local.

### 0.3 Scripts de package.json

Ya existen: `dev`, `build`, `start`, `typecheck`, `test`, `test:integration`, `db:generate`, `db:migrate` (dev), `db:deploy` (= `prisma migrate deploy`, el de producción), `db:seed`.

**Agregar** (único cambio de código de esta fase):

```json
"engines": { "node": ">=20 <25" }
```

### 0.4 Verificaciones puntuales

- **Prisma:** el cliente se genera en build (el build command de Render incluye `prisma generate`). Las migraciones se aplican con `migrate deploy` (NUNCA `migrate dev` en producción — es interactivo y puede resetear).
- **NextAuth:** estrategia JWT pura (sin tabla de sesiones) → no necesita nada especial en DB. En producción la cookie pasa a llamarse `__Secure-next-auth.session-token` (automático bajo HTTPS). Nada en el código lee el nombre de la cookie, así que no rompe nada.
- **Extensión:** la URL del backend se cambia en runtime desde la página de Opciones (`chrome.storage.sync`) — NO hay que recompilar para apuntar a producción.

---

## FASE 1 — Base de datos (hacer ANTES que el web service)

### Opción A: Render PostgreSQL (recomendada por simplicidad — misma consola, misma región)

1. Render Dashboard → New → PostgreSQL.
2. Name: `launchpad-db` · Region: **la misma que usará el web service** (ej. Oregon) · Plan: Starter.
3. Copiar la **Internal Database URL** (empieza `postgresql://…internal…`) — esa es `DATABASE_URL` para la app (tráfico interno, sin salir a internet).
4. La **External URL** solo para conectarse desde la máquina del dev (migraciones manuales, psql).

Con Render PG **no hace falta** connection string separada para migraciones ni pooling extra: la app es 1 instancia Node con el pool interno de Prisma.

### Opción B: Neon

1. Crear proyecto en Neon (Postgres 16, misma región aprox. que Render).
2. Neon expone DOS strings: **pooled** (pgbouncer, host `…-pooler…`) y **direct**.
3. App → usa la **pooled**. Migraciones → necesitan la **direct** (pgbouncer en modo transaction rompe `migrate deploy`).
4. Requiere un cambio en `prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")        // pooled
  directUrl = env("DIRECT_DATABASE_URL") // direct, solo migraciones
}
```

**[PENDIENTE DE CONFIRMAR]: ¿Render PG u Neon?** Si no hay razón fuerte (branching de DB, plan free), ir con A — menos piezas.

### Migraciones y seed

- Las migraciones corren automáticas en cada deploy vía **Pre-Deploy Command** de Render (sección 2). No se corren a mano.
- **Seed en producción: NO.** El seed crea 6 cuentas demo con contraseña `changeme123` — en una DB pública eso es una puerta abierta. Si se quiere data de demo para enseñar a inversionistas, correrlo UNA vez con contraseña fuerte:

```bash
DATABASE_URL="<external-url>" SEED_USER_PASSWORD="<contraseña-fuerte-única>" npm run db:seed
```

y borrar esas cuentas antes de abrir al público.

### Errores típicos de Prisma en producción (y cómo este repo ya los evita)

| Error | Estado |
|---|---|
| `PrismaClient is unable to run in the browser` | No aplica — todo el acceso es server-side |
| Cliente no generado en build | Cubierto: build command incluye `prisma generate` |
| `migrate dev` en prod | Usar SOLO `migrate deploy` (script `db:deploy`) |
| Demasiadas conexiones | 1 instancia Node = 1 pool. Con Neon usar pooled URL. No configurar `connection_limit` salvo que aparezcan errores |
| Rutas prerenderizadas tocando la DB en build | Ya arreglado en el repo (`force-dynamic` en categories/health) |

---

## FASE 2 — Render Web Service

1. Render Dashboard → New → **Web Service** (NO Static Site, NO Private Service).
2. Conectar el repo de GitHub `Cyb3rlinx/SkoolCo`, rama `main`.

| Campo | Valor |
|---|---|
| Runtime | Node |
| Region | La misma que la DB |
| Instance type | Starter (512MB). Subir a Standard si el build de Next se queda sin memoria |
| **Build command** | `npm ci && npx prisma generate && npm run build` |
| **Pre-Deploy Command** | `npx prisma migrate deploy` |
| **Start command** | `npm run start` |
| **Health Check Path** | `/api/health` |
| Auto-Deploy | **On Commit** (cada push a main con CI verde deploya) |
| Instancias | **1. No activar autoscaling** (rate limiter en memoria) |

Variables de entorno: sección 4 (cargarlas ANTES del primer deploy).

**Qué NO configurar:**
- ❌ Autoscaling / múltiples instancias (rompe el rate limiter).
- ❌ Docker (Next corre nativo en el runtime Node de Render).
- ❌ `NODE_ENV` a mano — Render/Next lo manejan (`next build`/`next start` ya operan en modo producción).
- ❌ Persistent disk — la app no escribe a disco.
- ❌ Cron jobs — no hay tareas programadas aún.

**Nota sobre Auto-Deploy y CI:** Render deploya en cada push aunque el CI de GitHub falle (son sistemas separados). Disciplina de equipo: no pushear a `main` con CI roto. (Protección de rama con required checks: la tiene que activar el dueño del repo, Cyb3rlinx — **[PENDIENTE DE CONFIRMAR]**.)

---

## FASE 3 — Variables de entorno (Render → Environment)

```bash
# --- Obligatorias desde el día 1 ---
DATABASE_URL=postgresql://launchpad_user:<pass>@<host-interno>/launchpad   # de Fase 1
NEXTAUTH_URL=https://<subdominio>.onrender.com    # cambiar al dominio real en Fase 4
NEXTAUTH_SECRET=<openssl rand -base64 32>          # generar NUEVO, jamás reutilizar el de dev
APP_URL=https://<subdominio>.onrender.com          # base de los links en emails; cambiar junto a NEXTAUTH_URL

# --- Email (Fase 6; sin esto los emails van a la consola/logs) ---
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=no-reply@<dominio-real>

# --- Extensión (Fase 7; sin esto la extensión no puede llamar la API) ---
ALLOWED_EXTENSION_ORIGINS=chrome-extension://<id-real>   # acepta lista separada por comas

# --- Solo si eligieron Neon (Opción B) ---
DIRECT_DATABASE_URL=postgresql://...direct-host.../launchpad

# --- Futuras (NO configurar aún; documentadas para la migración a Redis) ---
# UPSTASH_REDIS_REST_URL=
# UPSTASH_REDIS_REST_TOKEN=

# --- Opcional (sección 10) ---
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

Reglas: los secretos SOLO en el panel de Render (nunca commiteados — `.env` ya está en `.gitignore`). `SEED_USER_PASSWORD` NO va en producción.

---

## FASE 4 — Dominio con Cloudflare

**[PENDIENTE DE CONFIRMAR]: el dominio real.** Asumo `app.ejemplo.com` como placeholder.

1. En Render → Settings → Custom Domains → agregar `app.ejemplo.com`. Render muestra el target (`<servicio>.onrender.com`).
2. En Cloudflare → DNS → agregar:
   ```
   Tipo: CNAME · Nombre: app · Contenido: <servicio>.onrender.com · Proxy: DNS only (nube gris)
   ```
   **DNS only al inicio** — deja que Render emita su certificado Let's Encrypt sin interferencia. (Si después quieren el proxy naranja de Cloudflare: activar y poner SSL/TLS en **Full (strict)**. No usar "Flexible" jamás — loop de redirects.)
3. Esperar a que Render marque el dominio como verificado y el certificado como emitido (minutos).
4. Actualizar en Render: `NEXTAUTH_URL=https://app.ejemplo.com` y `APP_URL=https://app.ejemplo.com` → redeploy automático.
5. Probar después del cambio:

```bash
curl -s https://app.ejemplo.com/api/health          # {"status":"ok","db":"ok"}
curl -sI https://app.ejemplo.com/api/health | grep -iE "strict-transport|x-frame"  # headers presentes
```

y un login completo desde el navegador (el cambio de `NEXTAUTH_URL` invalida el flujo si quedó apuntando al dominio viejo). **Las sesiones existentes sobreviven** (JWT firmado por `NEXTAUTH_SECRET`, no por dominio), pero la cookie emitida en `onrender.com` no viaja al dominio nuevo → los usuarios de prueba deben loguearse de nuevo. Hacer el cambio de dominio ANTES de invitar gente.

---

## FASE 5 — NextAuth + cookies en producción

Qué cambia automáticamente bajo HTTPS (no requiere código):
- Cookie de sesión → `__Secure-next-auth.session-token` con `Secure; HttpOnly; SameSite=Lax`.
- CSRF token de NextAuth → `__Host-next-auth.csrf-token`.

**Checklist:**
- [ ] `NEXTAUTH_SECRET` distinto al de dev y de al menos 32 bytes.
- [ ] `NEXTAUTH_URL` exactamente igual al dominio público con `https://` y sin barra final.
- [ ] Login desde el sitio: registrarse, loguear, `GET /api/me` devuelve el perfil.
- [ ] Sesión desde la extensión: con sesión iniciada en el sitio en el MISMO perfil de Chrome, abrir el popup → "Mis links" carga (esa llamada es la sonda de sesión).

**Qué puede fallar con la extensión (y su explicación):**
- La extensión manda la cookie porque hace `fetch` con `credentials: "include"` y Chrome adjunta cookies `SameSite=Lax` a requests iniciados por extensiones **solo si la extensión tiene host permission sobre ese origen**. Por eso la Fase 7 (permiso del dominio de producción) es obligatoria — sin ese permiso el síntoma es "pide login aunque estés logueado".
- Perfiles de Chrome distintos = cookies distintas. Sesión y extensión deben vivir en el mismo perfil.

**CORS/CSRF (estado real del repo):**
- CORS deny-by-default: solo `/api/extension/*` y `/api/community-links*` y solo para los orígenes de `ALLOWED_EXTENSION_ORIGINS`. El resto de la API no emite ACAO → el navegador bloquea lecturas cross-origin.
- CSRF sobre la API REST propia: mitigado porque (a) todos los writes exigen body JSON (`req.json()` falla con form-encoded → 400), (b) un POST JSON cross-site dispara preflight, que falla fuera de la allowlist, (c) `SameSite=Lax` no adjunta la cookie en POSTs cross-site de páginas web. Riesgo residual aceptable para MVP.

---

## FASE 6 — Email transaccional (Resend)

Recomendación: **Resend** (ya está integrado en `src/lib/email.ts` vía HTTP — Postmark requeriría tocar código; no hay razón).

1. Cuenta en resend.com → Domains → Add domain → `ejemplo.com`.
2. Resend da 3 registros DNS → agregarlos en Cloudflare (DNS only):
   - TXT SPF, CNAMEs DKIM (los que indique el panel), y activar **DMARC** básico: `TXT _dmarc → "v=DMARC1; p=none; rua=mailto:<tu-email>"`.
3. Esperar "Verified" en Resend.
4. API Keys → crear key **solo con permiso de envío** → `RESEND_API_KEY` en Render.
5. `EMAIL_FROM=no-reply@ejemplo.com` (debe ser del dominio verificado — con otro dominio Resend rechaza o va a spam).

**Pruebas (contra producción):**
- [ ] Forgot password con email existente → llega email, el link (`APP_URL/reset-password?token=…`) apunta al dominio real, el reset funciona.
- [ ] Forgot password con email INEXISTENTE → misma respuesta 200 genérica, NO llega nada, y no se puede distinguir del caso anterior (anti-enumeración).
- [ ] Registro → llega email de verificación → `POST /api/auth/verify-email` con el token marca `emailVerified`.
- [ ] Resend verification → respeta rate limit (3/15min → 429 al cuarto).
- [ ] Token usado dos veces → 400. Token con más de 1h → 400.
- [ ] Caso de error: `RESEND_API_KEY` inválida → forgot-password devuelve 500 y el error queda en logs de Render (la key mala no se filtra al cliente).
- [ ] Revisar que los emails NO caigan a spam (Gmail + Outlook).

**Ojo (comportamiento actual, aceptado):** las páginas `/reset-password` y `/verify-email` a las que apuntan los links son del **frontend, que aún no existe**. Los endpoints funcionan (probables por API), pero el flujo de usuario final necesita esas 2 páginas → está en los bloqueadores (sección 14).

---

## FASE 7 — Extensión Chrome en producción

**Nada de código que reescribir** — la URL es configurable en runtime. Pasos:

1. **Probar contra producción (antes de Web Store):**
   - `cd extension && npm run build` → cargar `extension/dist` descomprimida.
   - Clic derecho en el ícono → **Opciones** → poner `https://app.ejemplo.com` → Guardar → Chrome pide permiso para ese origen (eso es `optional_host_permissions` funcionando) → Aceptar.
   - Copiar el **ID** de la extensión de `chrome://extensions`.
   - En Render: `ALLOWED_EXTENSION_ORIGINS=chrome-extension://<ese-id>` → redeploy.
   - **Ojo:** el ID de una extensión descomprimida se deriva de la RUTA de la carpeta → cada máquina genera un ID distinto. Para probar entre varios (Willy + cofundador): agregar ambos IDs separados por coma. Esto se vuelve trivial al publicar (ID único y estable para todos).
2. **Checklist para publicar en Chrome Web Store:**
   - [ ] En `manifest.json`: subir `version`, cambiar `host_permissions` de localhost a `https://app.ejemplo.com/*` (y dejar `optional_host_permissions` como está o quitar `http://*/*`).
   - [ ] Íconos 16/48/128 px (hoy NO existen — hay que crearlos) **[PENDIENTE]**.
   - [ ] Cuenta developer ($5 una vez) → subir zip de `dist/`.
   - [ ] Ficha: descripción, capturas (1280×800), justificación de permisos (`tabs`: "leer URL/título de la pestaña activa para pre-cargar el envío"; `storage`: "guardar la URL del backend").
   - [ ] **Privacy policy URL** (obligatoria porque usa `tabs`) — una página estática que diga qué se recolecta (URL+título solo al enviar, evento de uso first-party). **[PENDIENTE]**.
   - [ ] Publicada → un solo ID estable → dejar SOLO ese ID en `ALLOWED_EXTENSION_ORIGINS`.
   - Revisión de Google: días. No bloquea el MVP (carga descomprimida funciona para el equipo).

---

## FASE 8 — Seguridad: estado real y qué aceptar

| Ítem | Estado | Acción |
|---|---|---|
| Rate limiter en memoria | ✅ Correcto con 1 instancia. Se resetea en cada deploy/restart (aceptable MVP) | Migrar a Upstash ANTES de >1 instancia o de abrir registro al público masivo |
| Headers de seguridad | ✅ Ya en middleware (HSTS efectivo recién bajo HTTPS) | Nada |
| CORS | ✅ Deny-by-default, allowlist por env | Mantener la lista corta |
| Secrets | ✅ Solo server-side | Rotar `NEXTAUTH_SECRET` si alguna vez se filtra un log de entorno |
| Anti-enumeración | ✅ login/forgot/resend | Verificar en pruebas finales |
| Reset/verify tokens | ✅ sha256, 1h, single-use | Nada |
| Delete account | ✅ Con confirmación de contraseña + cascada | Probar en checklist |
| Logs | `console.error` en errores no manejados → logs de Render | No loguear bodies con contraseñas (ya no se hace) |
| Backups | ⚠️ Render PG Starter: backups diarios (verificar retención del plan) / Neon: PITR | Confirmar y anotar cómo restaurar **[PENDIENTE DE CONFIRMAR]** |
| HIBP | ✅ Fail-open (si HIBP cae, no bloquea registro) | Aceptado |

---

## FASE 9 — Monitoreo

1. **UptimeRobot (gratis) o Better Stack:** monitor HTTP a `https://app.ejemplo.com/api/health`, intervalo 5 min, alerta por email/Telegram si no responde 200. Con esto: **app viva** (responde) y **DB viva** (el endpoint devuelve 503 con `db: "down"` si Postgres no contesta — configurar la alerta por "status code ≠ 200", no solo por timeout).
2. **Sentry (recomendado, ~30 min):** `npx @sentry/wizard@latest -i nextjs` en el repo, `SENTRY_DSN` en Render. Captura los errores 500 con stack trace. Si se pospone, los `console.error` de `withErrorHandling` en los logs de Render son el fallback — suficiente la primera semana.
3. **Logs de Render:** revisar tras cada deploy (arranque limpio, migraciones aplicadas en el pre-deploy).
4. **Métricas mínimas a mirar la primera semana:** errores 5xx en logs, latencia del health check (UptimeRobot la grafica), memoria de la instancia (panel de Render — si pasa ~80% sostenido, subir de plan), y el conteo de filas en `moderation_reports` (spam temprano).

---

## FASE 10 — Checklist de pruebas finales (contra el dominio de producción)

Auth y cuenta:
- [ ] Registro → 201 + email de verificación llega
- [ ] Registro con contraseña filtrada (ej. `password123`) → 400 con mensaje de contraseña comprometida
- [ ] Login OK → `/api/me` responde
- [ ] Login: 6 intentos malos seguidos con el mismo email → el 6º falla aunque la contraseña sea correcta (rate limit) — esperar 15 min o usar otro email para seguir probando
- [ ] Forgot → reset → login con contraseña nueva → token reutilizado da 400
- [ ] Verify email + resend (429 al exceder)
- [ ] Delete account con contraseña mala → 403; con la buena → 204 y sus productos desaparecen

Producto y comunidad:
- [ ] Crear producto (LIVE) → aparece en listado y detalle
- [ ] Upvote → contador sube; repetir → idempotente; el maker recibe notificación
- [ ] Comment → aparece; el maker recibe notificación; `unreadCount` > 0; mark-read lo baja a 0
- [ ] Search `?q=` encuentra por nombre/tagline/descripción
- [ ] Leaderboard con datos coherentes
- [ ] Community link duplicado → 409

Plataforma:
- [ ] `/api/health` → 200 `{status:"ok",db:"ok"}`
- [ ] `/api/docs` carga Swagger UI y el "Try it out" funciona contra prod
- [ ] Preflight CORS con el ID real → 204 + ACAO; con un origen inventado → 403
- [ ] Extensión CON sesión: enviar un post de Skool real → aparece en "Mis links" como Pendiente
- [ ] Extensión SIN sesión: ambas pestañas piden login y el botón abre el sitio
- [ ] Los errores 401/409/429 muestran los mensajes correctos en el popup

---

## FASE 11 — Comandos exactos (resumen para el dev)

```bash
# 1. Preparación local (todo debe pasar)
npm ci && npx prisma generate && npm run typecheck && npm test && npm run build
cd extension && npm ci && npm run typecheck && npm test && npm run build && cd ..

# 2. Único cambio de código pre-deploy
#    package.json → agregar: "engines": { "node": ">=20 <25" }
#    (+ directUrl en schema.prisma SOLO si eligen Neon)
git add package.json && git commit -m "chore: engines de Node para Render" && git push origin main

# 3. Generar el secret de producción (guardarlo directo en Render, no en archivos)
openssl rand -base64 32

# 4. (Solo si quieren demo data en prod — ver advertencia en Fase 1)
DATABASE_URL="<external-url>" SEED_USER_PASSWORD="<fuerte-y-única>" npm run db:seed

# 5. Smoke test post-deploy
curl -s https://app.ejemplo.com/api/health
curl -s -o /dev/null -w "%{http_code}\n" -X OPTIONS "https://app.ejemplo.com/api/community-links" \
  -H "Origin: chrome-extension://<id-real>" -H "Access-Control-Request-Method: POST"   # espera 204
```

Todo lo demás (migraciones, build, deploy) lo hace Render automáticamente en cada push a `main`.

---

## FASE 12 — Migración futura (triggers concretos, no fechas)

| Cambio | Cuándo (trigger medible) |
|---|---|
| Rate limiter → Upstash Redis | ANTES de: segunda instancia, autoscaling, o campaña de adquisición abierta. Solo se toca `src/lib/rate-limit.ts` (los call sites no cambian) |
| >1 instancia / autoscaling | Después de Redis + cuando la instancia única sature CPU/memoria con tráfico real |
| Colas (emails, notificaciones) | Cuando el envío inline agregue latencia visible (>300ms extra por request) o Resend empiece a rate-limitar |
| Storage de imágenes (logos) | Cuando los usuarios pidan subir archivos (hoy es URL). R2/S3 + presigned URLs |
| Search → tsvector | Catálogo >~5k productos o `?q=` >200ms en p95 |
| Vercel / Fly / AWS | Solo con una razón concreta (edge, multi-región, equipo que lo pida). Requiere Redis + pooling resuelto ANTES. No migrar "porque sí" |

---

## FASE 13 — Bloqueadores antes de enseñar a clientes/inversionistas

1. **Frontend mínimo** — es lo ÚNICO grande que falta. El backend no se puede "enseñar" solo (Swagger no es una demo). Incluye las páginas `/reset-password` y `/verify-email` a las que ya apuntan los emails. ← del cofundador
2. Deploy ejecutado (Fases 1–4) con dominio real y SSL verde.
3. Resend verificado con SPF/DKIM (un email de reset cayendo en spam durante una demo mata la confianza).
4. Seed demo con contraseñas fuertes o datos reales del equipo — jamás `changeme123` accesible desde internet.
5. Checklist de la Fase 10 completo, corrido contra producción.
6. UptimeRobot activo (enterarse por alerta, no por el inversionista).
7. `NEXTAUTH_SECRET` de producción nuevo y guardado en un password manager.

## FASE 14 — Puede esperar (no gastar tiempo ahora)

- Publicación en Chrome Web Store (la carga descomprimida sirve para el equipo y demos).
- Sentry (deseable, no bloqueante — los logs de Render cubren la primera semana).
- Upstash Redis (trigger claro en Fase 12).
- Colas, storage de imágenes, tsvector, multi-instancia.
- Cloudflare proxy naranja/WAF (DNS-only alcanza; activar si aparece abuso).
- OAuth Google/GitHub.
- Emails de notificación (las in-app ya existen).
- Migrar de Render a cualquier otra plataforma.

---

## Riesgos que este plan acepta a sabiendas (sin humo)

1. **Rate limits se resetean en cada deploy** (memoria). Un atacante que coincida con un deploy tiene ventana fresca. Aceptable a esta escala.
2. **Auto-deploy no espera al CI de GitHub.** Un push roto a main puede llegar a prod. Mitigación: protección de rama (dueño del repo) o disciplina de PRs.
3. **HIBP fail-open:** si HIBP está caído, se aceptan contraseñas sin verificar contra filtraciones. Decisión deliberada (no bloquear registros por un tercero).
4. **Sin staging:** con 1 dev y pre-usuarios, prod-only es razonable. El primer entorno de staging tiene sentido cuando haya usuarios reales activos.
