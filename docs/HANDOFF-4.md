# 🤝 Handoff #4 — Rediseño premium de la landing

**Fecha:** 9 de julio de 2026
**Repo:** https://github.com/Cyb3rlinx/SkoolCo
**Commit:** `ad91208` — feat(frontend): rediseño premium de la landing
**Anteriores:** `HANDOFF-3.md` (foto completa) · `HANDOFF-3-frontend.md` (frontend MVP).
Todo lo de esos documentos sigue vigente; esto cubre solo la tanda de hoy.

---

## 1. Resumen en 30 segundos

La landing (`/`) se rediseñó completa con identidad premium: paleta definitiva
morado #5B2CFF sobre blanco, hero de dos columnas con un cluster de 4 cards de
dashboard, sección de lanzamientos destacados con sparklines, "Cómo funciona"
con conector punteado, banner de la extensión con gradiente profundo y mockup,
CTA dual y footer de 4 columnas. **La paleta se cambió en los design tokens**,
así que TODA la app (launches, perfil, admin…) heredó la identidad nueva sin
tocar sus componentes. Typecheck limpio, 24/24 tests verdes, QA visual en
desktop y mobile.

## 2. Qué cambió y dónde

| Archivo | Qué |
|---|---|
| `src/app/globals.css` | Tokens de color nuevos (hex de referencia en comentario) + `.brand-gradient-deep`. Radius base 0.875rem |
| `tailwind.config.ts` | Sombras `soft`/`lift` con tinte de marca rgba(91,44,255,0.22) |
| `src/app/page.tsx` | Ahora solo compone 6 secciones de `components/landing/` |
| `src/components/landing/data.ts` | ⭐ Datos mock (makers, actividad, lanzamientos, momentum). Formas espejo de los DTOs del API |
| `src/components/landing/sparkline.tsx` | `Sparkline` (línea/área) y `MiniBars` en SVG puro, cero dependencias nuevas |
| `src/components/landing/hero.tsx` | Hero + 4 dash-cards (top comunidad, tendencia, actividad, momento) |
| `src/components/landing/stats-bar.tsx` | 9K+ / 6K+ / 100% / 24/7 |
| `src/components/landing/featured-launches.tsx` | Card "Top del día" + 4 filas rankeadas con vote buttons |
| `src/components/landing/how-it-works.tsx` | 3 pasos numerados, ancla `#como-funciona` |
| `src/components/landing/extension-banner.tsx` | Banner gradiente #32128A→#5B2CFF + mockup del popup |
| `src/components/landing/cta-section.tsx` | ¿Eres creador? / ¿Miembro de la comunidad? |
| `src/components/layout/site-header.tsx` | Link "Recursos" → `/#como-funciona` |
| `src/components/layout/site-footer.tsx` | 4 columnas (Plataforma/Comunidad/Recursos/Compañía) + copy nuevo |

## 3. Paleta definitiva (no cambiar sin razón nueva)

- Fondo `#FFFFFF` · suaves `#F7F4FF` / `#FAFAFC` · lavanda `#EEE8FF`
- Texto `#0B1020` · secundario `#5F6472` · muted `#8A8FA3`
- Morado principal `#5B2CFF` · profundo `#32128A` · gradiente `#6D3DFF`
- Bordes `#E7E3F2` · sombra premium `rgba(91,44,255,0.22)`
- Acentos de producto (solo tiles): teal `#0F8F8A`, magenta `#D9289D`,
  azul `#2389E8`, naranja `#F97316`

Los tokens viven en `globals.css` como variables HSL — cambiar la marca es
tocar un solo archivo.

## 4. Decisiones de hoy (contexto para no re-litigar)

- **Landing 100% estática con datos mock** (`landing/data.ts`) en vez del feed
  vivo que tenía antes: carga instantánea, cero estados de loading en la primera
  impresión, y conectarla al API real es cambiar un archivo. El feed vivo sigue
  intacto en `/launches`.
- **Sparklines en SVG propio** en vez de una librería de charts: son 2
  componentes de ~60 líneas; no se justifica una dependencia.
- **"Recursos" en el header apunta a `#como-funciona`** en vez de un dropdown
  con páginas que no existen.
- **Links del footer a páginas pendientes** (Normas, Novedades, Guías, Ayuda,
  Contacto, Acerca de, Privacidad, Términos) quedaron con `TODO(content)`; los
  cubre el 404 con marca. Privacidad y Términos son requisito para la Chrome
  Web Store — siguen pendientes de contenido real.

## 5. Verificación

- `npm run typecheck` → limpio
- `npm test` → 24/24
- QA visual en preview: desktop (hero, stats, destacados, cómo funciona,
  banner, CTA, footer) y mobile 375px (hero apilado, cards debajo, stats 2x2,
  filas responsivas). Sin errores de consola.

## 6. Pendientes (sin cambios vs. HANDOFF-3, con un agregado)

| Pendiente | Dueño |
|---|---|
| Dominio + Render PG vs Neon/Supabase → ejecutar `DEPLOY-PLAN.md` | Willy |
| Resend (SPF/DKIM) al tener dominio | Willy |
| Protección de rama `main` | Cyb3rlinx |
| Contenido real: Privacidad, Términos, Normas, Guías, Ayuda, Contacto | Ambos |
| 5–10 usuarios reales — la regla de oro | Ambos |
