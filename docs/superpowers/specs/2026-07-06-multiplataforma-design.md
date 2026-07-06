# Diseño — Community links multi-plataforma

**Fecha:** 6 de julio de 2026 · **Estado:** aprobado en chat ("agrega soporte multiplataformas")

## Qué cambia

Los community-links dejan de aceptar solo `skool.com` y pasan a una **lista
blanca curada** de plataformas de comunidad: Skool, Discord, YouTube, X
(Twitter), Facebook, LinkedIn, Instagram, Telegram, Circle. Nunca "cualquier
URL" — evita que la cola de moderación se llene de spam/links maliciosos.

## Diseño

- **`src/lib/platforms.ts` — única fuente de verdad.** Módulo puro (sin
  dependencias): registro `PLATFORMS` (id, label, hosts con match de sufijo)
  y `detectPlatform(url): string | null` (exige https + host del allowlist).
  Lo consumen el backend (Zod) y la extensión (esbuild lo bundlea importándolo
  por ruta relativa) → imposible desincronizarse.
- **Backend:** `createCommunityLinkSchema` valida con `detectPlatform`;
  `POST /api/community-links` guarda `sourcePlatform` derivado del dominio
  (antes hardcodeado "skool"). Sin migración: el campo ya es String.
- **Extensión:** `skool.ts` → `community.ts`: `isCommunityPostUrl` (plataforma
  detectada + path no raíz + primer segmento no reservado tipo login/signup)
  y `cleanTitle` generalizado (limpia sufijos "| Skool", "- YouTube", etc.
  desde los labels del registro). Copy del popup actualizado. Versión 0.2.0.
- **OpenAPI:** descripciones actualizadas (plataformas soportadas).

## Sin cambios

Modelo de seguridad intacto: envíos manuales con consentimiento, verificación
humana (PENDING → VERIFIED), unique por usuario+URL, rate limits, CORS.
