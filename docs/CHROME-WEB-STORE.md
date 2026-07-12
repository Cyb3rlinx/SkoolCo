# 🧩 Publicar "LaunchPad — Logros" en la Chrome Web Store

Guía completa: qué está listo, qué copiar/pegar en la ficha, y los pasos exactos.

## 0. Estado

| Pieza | Estado |
|---|---|
| Íconos 16/32/48/128 (marca violeta + cohete) | ✅ en `extension/icons/`, copiados a `dist/` por el build |
| Manifest v0.3.0 con íconos | ✅ |
| ZIP listo para subir | ✅ `extension/release/launchpad-logros-v0.3.0.zip` (regenerar: `npm run build` y comprimir `dist/`) |
| Política de privacidad | ✅ página `/privacidad` — **necesita URL pública** (bloqueado por deploy/dominio) |
| Cuenta de developer de Chrome | ⏳ Willy — registro único de $5 en https://chrome.google.com/webstore/devconsole |
| Captura(s) 1280×800 | ⏳ tomar del popup real una vez cargada (abajo cómo) |

## 1. Antes de subir (requisitos duros)

1. **Deploy en línea con dominio** — la ficha exige una URL pública de política de
   privacidad: usar `https://<dominio>/privacidad`. Con localhost no se puede publicar.
2. **Backend por defecto:** antes del ZIP final, considerar cambiar
   `host_permissions` en `manifest.json` de `http://localhost:3000/*` a
   `https://<dominio>/*` (la extensión igual permite cambiar la URL en Opciones).
3. Tras publicar, Chrome asigna el **ID definitivo** → agregarlo en el env de
   producción: `ALLOWED_EXTENSION_ORIGINS=chrome-extension://<id>`.

## 2. Ficha de la tienda (copiar/pegar)

**Nombre:** LaunchPad — Logros

**Resumen corto (≤132 chars):**
> Celebra los logros de tu comunidad: comparte posts públicos a LaunchPad con un clic. Sin bots, sin automatización.

**Descripción larga:**
> LaunchPad — Logros te ayuda a dar visibilidad a los logros reales de tu
> comunidad (Skool, Discord, YouTube, X, Facebook, LinkedIn, Instagram,
> Telegram y Circle).
>
> ¿Cómo funciona?
> 1. Abre un post público de logro en tu comunidad.
> 2. Haz clic en el ícono de la extensión.
> 3. Revisa el título, elige el tipo y envíalo a LaunchPad.
>
> El logro queda pendiente hasta que un moderador humano lo verifica, y luego
> aparece en el muro de logros de la comunidad.
>
> Diseño consent-first, en serio:
> • Solo actúa cuando TÚ haces clic — no captura nada en segundo plano.
> • Solo posts públicos — nunca contenido privado.
> • Cero automatización — no vota, no publica, no hace scraping.
> • No almacena credenciales de otras plataformas.
> • Respeta las reglas de las comunidades de origen.
>
> Pensada para makers y comunidades que celebran el progreso real de su gente.

**Categoría:** Herramientas sociales y de comunicación · **Idioma:** Español

**Justificación de permisos (el formulario la pide):**
- `activeTab` / `tabs`: leer URL y título de la pestaña activa SOLO al abrir el
  popup, para pre-cargar el post que el usuario quiere compartir.
- `storage`: guardar la URL del backend configurada por el usuario.
- Host `https://<dominio>/*`: llamar a la API de LaunchPad con la sesión del usuario.
- `optional_host_permissions`: permitir que el usuario apunte a otra instancia
  desde Opciones (se pide permiso en ese momento).
- **Single purpose:** compartir manualmente posts públicos de comunidades como
  logros hacia LaunchPad.

**Privacidad (declaración):** no vende datos; solo envía título+URL elegidos por
el usuario a su instancia de LaunchPad; política en `https://<dominio>/privacidad`.

## 3. Captura de pantalla (mínimo 1, 1280×800)

Con la extensión cargada y sesión iniciada: abrir un post de Skool → clic en el
ícono → capturar el popup sobre la página (Cmd+Shift+4 en Mac, recortar a
1280×800). Alternativa temporal: el mockup interactivo de `/extension`.

## 4. Pasos de publicación (Willy)

1. https://chrome.google.com/webstore/devconsole → pagar registro ($5, una vez).
2. **New item** → subir `extension/release/launchpad-logros-v0.3.0.zip`.
3. Pegar ficha (sección 2), subir captura(s), URL de privacidad.
4. Visibilidad: **Unlisted** recomendado al inicio (solo con link — perfecto
   para la comunidad de Skool) → Public cuando quieran.
5. Enviar a revisión (suele tardar 1–3 días).
6. Al aprobarse: copiar el ID → `ALLOWED_EXTENSION_ORIGINS` en Vercel → redeploy.
7. Compartir el link de instalación en Skool (post fijo + Classroom).
