# Diseño — Extensión de navegador "Logros" (v1)

**Fecha:** 5 de julio de 2026
**Estado:** Aprobado por Willy (diseño presentado en chat)

## Propósito

Extensión Chrome (MV3) para que un miembro autenticado de LaunchPad envíe,
con un clic y consentimiento explícito, el post público de Skool que está
viendo como "logro" a la plataforma, y vea el estado de sus envíos.

Respeta el modelo de seguridad del backend: envíos manuales, solo URLs
públicas `https://…skool.com`, sin scraping, sin credenciales de Skool,
sin automatización.

## Alcance v1

- **Flujo Enviar:** popup detecta si la pestaña activa es un post de Skool
  (solo URL + título de pestaña vía `activeTab`; nunca contenido de página).
  Título pre-cargado editable, selector de tipo (`logro | milestone |
  announcement | other`), botón enviar → `POST /api/community-links`.
- **Mis links:** pestaña con `GET /api/community-links?mine=1` y chips de
  estado (🟡 PENDING / 🟢 VERIFIED / 🔴 REJECTED).
- **Distribución:** Chrome, carga local descomprimida (dev). Web Store queda
  para cuando haya backend desplegado.

## Arquitectura

TypeScript + esbuild, sin framework. Vive en `extension/` dentro del repo
SkoolCo con `package.json` propio (no toca el CI del backend).

```
extension/
  manifest.json             # MV3: action popup, options_page, permissions
  src/popup.html/.ts/.css   # 2 pestañas: Enviar | Mis links
  src/options.html/.ts      # URL del backend (chrome.storage.sync)
  src/api.ts                # cliente tipado de la API
  src/skool.ts              # lógica pura: isSkoolPostUrl, cleanTitle
  build.mjs                 # esbuild → dist/
```

## Decisiones clave

- **Auth:** misma sesión NextAuth del sitio — `fetch` con
  `credentials: "include"` + `host_permissions` sobre la URL del backend.
  **Sonda de sesión:** `GET /api/community-links?mine=1`; un 401 muestra
  "Inicia sesión en LaunchPad" (abre el sitio en una pestaña). No se usa
  `/api/me` porque no está en los paths CORS del middleware; los dos
  endpoints usados sí lo están (`/api/community-links`, `/api/extension`).
- **Permisos mínimos:** `activeTab`, `storage`, `tabs` (solo url/title de la
  pestaña activa) + `host_permissions` de la URL configurada del backend.
  Para dev con URL configurable: `http://localhost/*` y `https://*/*`
  quedan demasiado amplios — se usa `optional_host_permissions` y se pide
  permiso en runtime para la URL configurada.
- **Config:** URL base del backend en `chrome.storage.sync`, default
  `http://localhost:3000`, editable en options (el deploy futuro no requiere
  recompilar).
- **Eventos:** `extension_opened` al abrir popup y `link_submitted` al enviar
  — fire-and-forget (fallos silenciosos, jamás bloquean el flujo).
- **Errores mapeados:** 201 enviado (pendiente de verificación) · 409 ya
  enviado · 429 demasiados envíos · 401 sesión requerida · red caída →
  mensaje claro. Copy en español neutro.
- **Activación backend (manual de Willy):** cargar descomprimida → copiar el
  ID → `.env`: `ALLOWED_EXTENSION_ORIGINS=chrome-extension://<id>`.

## Testing

- Vitest sobre `src/skool.ts` (URLs de post válidas/ inválidas, limpieza de
  títulos con sufijos de Skool) y sobre el mapeo de errores de `api.ts`.
- Popup: checklist manual de smoke (login, enviar, duplicado, listado).

## Fuera de alcance (YAGNI)

- Web Store, Firefox, notificaciones, ver logros de otros, badge con
  contador, content scripts, lectura de contenido de página.
