# Denveler — Logros (extensión Chrome)

Extensión MV3 para enviar posts públicos de Skool como logros a Denveler
(manual, con consentimiento — ver el modelo de seguridad en el README raíz).

## Instalación (dev, carga local)

1. Compilar:
   ```bash
   cd extension
   npm install
   npm run build
   ```
2. En Chrome: `chrome://extensions` → activar **Modo de desarrollador** →
   **Cargar extensión sin empaquetar** → elegir la carpeta `extension/dist`.
3. Copiar el **ID** que Chrome le asignó (aparece en la tarjeta de la extensión).
4. En el `.env` del backend agregar y reiniciar el server:
   ```bash
   ALLOWED_EXTENSION_ORIGINS=chrome-extension://<ese-id>
   ```
5. Iniciar sesión en Denveler (`http://localhost:3000`) en el mismo Chrome —
   la extensión usa esa misma sesión.

> Si cambias la URL del backend (deploy futuro): clic derecho en el ícono →
> **Opciones** → guardar la nueva URL (Chrome pedirá permiso para ese origen).
> No hace falta recompilar.

## Uso

- Abre un post público de tu comunidad — plataformas soportadas: **Skool,
  Discord, YouTube, X (Twitter), Facebook, LinkedIn, Instagram, Telegram y
  Circle** (allowlist compartido con el backend en `src/lib/platforms.ts`).
- Clic en el ícono de la extensión → pestaña **Enviar**: título pre-cargado
  (editable), tipo, y **Enviar como logro**. Queda **pendiente** hasta que un
  moderador lo verifique.
- Pestaña **Mis links**: estado de tus envíos (Pendiente / Verificado / Rechazado).

## Checklist de smoke manual

- [ ] Sin sesión → ambas pestañas piden iniciar sesión y el botón abre el sitio.
- [ ] En una página que no es un post de Skool → mensaje "Abre un post…".
- [ ] En un post de Skool con sesión → envío OK y aparece en Mis links (Pendiente).
- [ ] Reenviar el mismo post → "Ya enviaste este link antes."
- [ ] Backend apagado → mensaje de conexión, sin crashes.

## Desarrollo

```bash
npm run typecheck   # tipos
npm test            # unit tests (detección de posts, mapeo de errores)
npm run build       # regenera dist/ (recargar la extensión en chrome://extensions)
```
