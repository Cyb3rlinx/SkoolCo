# 🎯 Auditoría estratégica y plan — "Incubadora de Proyectos" (SkoolCo/LaunchPad)

**Fecha:** 12 de julio de 2026 · **Autores:** análisis solicitado por Willy + Kevin
**Regla de evidencia:** cada afirmación va marcada — **[C]** confirmado de primera mano, **[I]** inferencia, **[R]** recomendación, **[S]** supuesto a validar.

---

## 1. Resumen ejecutivo

La plataforma actual (lanzamientos) está **construida, en producción y verificada** — con 2 productos reales y 0 usuarios de comunidad todavía. La pregunta estratégica no es técnica, es de **liquidez**: proponen sumar un segundo marketplace (compraventa) encima de un primer marketplace que aún no demostró el suyo.

**Veredicto: NO lanzar el híbrido completo ahora.** Recomiendo la **Opción D ejecutada por etapas**: hoy solo lanzamientos (ya existe), un **puente barato de validación** de compraventa (badge "abierto a ofertas" + métricas declaradas + solicitud de contacto — ~1 semana de desarrollo), y construir el marketplace real **solo si el puente da señal medible**. La evidencia competitiva recogida hoy respalda esto con fuerza (secciones 7–9).

## 2. Alcance real de la auditoría

**Primera mano [C]:** yo (el agente que escribe esto) construí o modifiqué hoy gran parte del código auditado, y verifiqué en producción: registro → login → publicar producto → subir logo → galería → votos → borrado de cuenta (prueba E2E real en skool-co.vercel.app, usuario QA creado y eliminado); typecheck limpio, 31 tests unitarios + 9 de extensión en verde (corridos hoy sobre `b9fd72a`), build de producción exitoso (30 rutas), deploy actual sirviendo OpenAPI 0.6.0. Flujos recorridos en navegador real: landing, launches, detalle, submit, perfil, admin, extensión, login/signup, 404.

**Fuentes externas consultadas HOY (12-jul-2026):**
- acquire.com/pricing/ y /seller-pricing/ (scraping directo)
- trustmrr.com (scraping directo)
- trylaunch.ai (navegador, render completo)
- producthunt.com (navegador, render completo)

**No pude comprobar:** analítica interna de competidores (visitantes reales, conversión), comisiones de PH (no publica pricing en su home), volumen real de transacciones de Acquire/TrustMRR, y el contenido interno de sus flujos autenticados. Las cifras de "500k buyers" (Acquire), "180K monthly visitors" (TrustMRR) y "500,000+ vibe coders" (TryLaunch) son **afirmaciones de marketing de cada plataforma**, no verificadas.

**Supuestos [S]:** tamaño de la comunidad Skool de los socios; horas semanales disponibles; presupuesto; país de constitución legal.

## 3. Auditoría del producto actual

| Área | Estado | Evidencia |
|---|---|---|
| Propuesta de valor | ⚠️ Clara para "lanzar", muda sobre el futuro híbrido | [C] landing actual |
| Registro/login | ✅ Completo, con verificación email y reset (emails aún en log — falta dominio+Resend) | [C] |
| Publicación | ✅ Con logo (upload real), preview en vivo, modos LIVE/programado/borrador | [C] E2E hoy |
| Detalle producto | ✅ Galería real (hasta 5 fotos), upvote, comentarios, reportar, relacionados | [C] E2E hoy |
| Perfiles | ✅ Propio + público de maker | [C] |
| Búsqueda/filtros | ✅ Básicos (contains, categorías, orden) | [C] |
| Moderación | ✅ Cola real de reportes + verificación de logros | [C] |
| Móvil | ✅ Verificado 375px | [C] |
| SEO | ⚠️ og:image listo; sin sitemap; páginas de producto client-rendered | [C]/[I] |
| Confianza | ⚠️ Sin dominio propio (`.vercel.app` resta seriedad) | [I] |

**Conclusión:** el área de lanzamientos está a nivel de MVP público competitivo. Los huecos reales son de **distribución y confianza** (dominio, emails, usuarios), no de features.

## 4. Auditoría técnica (hallazgos priorizados)

| # | Hallazgo | Sev. | Esfuerzo | ¿Bloquea? | Acción |
|---|---|---|---|---|---|
| T1 | Rate limiter en memoria + Vercel serverless = límites casi nulos en prod | **Alta** | S | No, pero urgente con usuarios | Upstash Redis (drop-in documentado en `rate-limit.ts`) [C] |
| T2 | Emails no salen en prod (sin dominio/Resend configurado) | **Alta** | S (bloqueado por dominio) | Para verificación/reset sí | Comprar dominio → SPF/DKIM |
| T3 | Imágenes en Postgres (bytea) | Media | M | No | OK hasta miles; migrar a Supabase Storage después (URLs estables, cambio interno) [C] |
| T4 | Prisma sin pooler explícito en serverless | Media | S | No | Verificar que DATABASE_URL usa el pooler de Supabase (puerto 6543) [S — no pude leer el env de prod] |
| T5 | Sin monitoreo/alertas ni analytics | Media | S | No | GitHub Actions ping + Vercel Analytics |
| T6 | Sin backups verificados de la DB | **Alta** | S | Antes de usuarios reales | Confirmar backups de Supabase (plan free = 7 días) [S] |
| T7 | Frontend sin tests automatizados | Media | M | No | Aceptable en MVP; priorizar E2E de flujos de pago cuando existan |
| T8 | Contenido legal placeholder (Privacidad/Términos genéricos) | **Alta** | S | Antes de usuarios reales | Revisión con abogado (ver §22) |

Fortalezas confirmadas [C]: validación Zod server-side en todo, HIBP, tokens hasheados single-use, anti-enumeración, CORS deny-by-default, magic-byte sniffing en uploads, migraciones ordenadas con historial consistente en prod, CI verde, OpenAPI vivo.

**Conclusión:** deuda técnica pequeña y bien localizada. Nada exige reescritura. T1+T2+T6+T8 son la lista corta pre-usuarios.

## 5. Riesgos críticos

1. **Doble marketplace vacío** — el riesgo #1, estratégico, no técnico (ver §9).
2. **Rate limiting inefectivo en serverless** (T1): abuso de registro/upvotes puede ensuciar la plataforma justo en el lanzamiento.
3. **Métricas financieras falsas**: publicar MRR sin disclaimers ni verificación puede dañar la marca y crear exposición legal (§22).
4. **Marca provisional**: "skool-co" usa la marca Skool ajena en el subdominio; el nombre definitivo + dominio es urgente [R].

## 6. Benchmark competitivo (consultado 12-jul-2026)

### Product Hunt — descubrimiento/lanzamientos
- Confirmado en su home [C]: rankings diarios/semanales/mensuales con 100–1,500 votos por producto top; slots **"Promoted"** visibles = monetización por publicidad; newsletter como retención.
- Lanzar es gratis (conocimiento general, no verificado hoy [S]).
- **Debilidad explotable:** todo en inglés; un maker hispano promedio se pierde en el ruido global.

### Acquire.com — compraventa
- Comprador [C]: Basic **gratis** (ver listings públicos); membresía **desde $390** (Premium ≤$250k asking / Platinum sin tope) con financials, mensajería, herramientas de cierre y "Academy".
- Vendedor [C]: comisión al cierre **8% / 7% / 6%** (tramos <$250k / $250k–1M / >$1M) + **$25 / $50 / $100 por mes** por listar. Escrow **gratis vía partners**. NDAs automáticos, builders de LOI/APA, **equipo humano de curación y asesores M&A**; footer: *"Acquire.com Brokerage Services, Inc., CA DRE #02167544"* — **tienen licencia de brokerage en California**.
- **Lección:** la compraventa seria es un negocio **operativo y regulado**, no solo software.

### TrustMRR — métricas verificadas + venta
- [C]: "database of verified startup revenues"; verificación **automática** vía Stripe, RevenueCat, Superwall, Creem (actualización horaria); leaderboard por MRR; badge **FOR SALE** opcional sobre el perfil; múltiplos visibles (0.3x–6x); listados micro ($2.2k–$600k); feed social de founders; API pública. Operación de indie maker (Marc Lou).
- **Lección:** existe un camino software-first a la compraventa: verificación automatizada + badge + contacto, **sin escrow propio ni brokerage**. Es LA referencia para nuestra etapa 3.

### TryLaunch — lanzamientos para "vibe coders"
- [C]: clon de PH nichado; gratis; monetiza con **slots "Ad" y "Featured Partner"**; colecciones por herramienta IA (Cursor, Claude Code…).
- **Dato demoledor [C]: sus lanzamientos de la semana tienen 1–7 votos.** Con supuestos "500k vibe coders". Features ≠ liquidez.

## 7. Matriz comparativa

| | PH | TryLaunch | Acquire | TrustMRR | Nosotros hoy | MVP propuesto |
|---|---|---|---|---|---|---|
| Lanzamientos/votos | ✅ líquido | ✅ vacío | — | parcial (feed) | ✅ construido | ✅ + comunidad |
| Métricas declaradas | — | parcial (MRR badge) | ✅ | ✅ | — | ✅ etapa 2 |
| Métricas verificadas | — | — | ✅ (proceso interno) | ✅ (Stripe auto) | — | etapa 3 si hay señal |
| Compraventa | — | — | ✅ full-service | ✅ light | — | puente de validación |
| Escrow/legal | — | — | ✅ (partners + licencia) | ❌ (fuera de la plataforma) | — | ❌ nunca propio [R] |
| Idioma español | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ **la diferenciación** |
| Comunidad propia | ✅ | ❌ | ❌ | parcial | ✅ Skool | ✅ el motor |

## 8. Diagnóstico del enfoque híbrido

- **¿Un producto o dos?** Dos productos conectados. Comparten al *founder* (vendedor futuro), pero el lado que da vida a cada uno es distinto: **votantes** en lanzamientos, **compradores con dinero** en compraventa. No se transfieren automáticamente.
- **¿Qué lado es más difícil?** Compradores. Acquire pone 500k compradores como SU asset central; TrustMRR pone la verificación. Nosotros no tenemos ninguno de los dos hoy.
- **¿Riesgo de dos marketplaces vacíos?** Sí, y TryLaunch es la prueba de que hasta UNO solo es difícil: con marca, features y tráfico, sus launches tienen 1–7 votos [C].
- **¿Qué no cubren PH/Acquire?** El maker hispano: lanzar en su idioma ante una comunidad que lo conoce, y vender activos micro (<$25k) que a Acquire no le interesan económicamente [I].
- **¿Qué depende de operación humana?** En compraventa: curación de listings, verificación, disputas, acompañamiento. Subestimarlo es el error clásico.

**Decisión recomendada: Opción D por etapas.**
1. **Etapa 1 (ya existe):** solo lanzamientos, activados con la comunidad Skool. Meta: probar liquidez del lado fácil.
2. **Etapa 2 (≈1 semana dev):** el puente — en el producto: `MRR declarado` (opcional, con disclaimer), badge **"Abierto a ofertas"**, botón "Solicitar contacto" (formulario + email al maker + registro en DB). Mide AMBOS lados sin construir marketplace.
3. **Etapa 3 (solo con señal):** verificación automática estilo TrustMRR (Stripe read-only), página de venta con ficha estándar, y monetización del contacto. **Nunca** escrow/broker propio: derivar cierres a Escrow.com o similar [R].

**Umbral de señal sugerido [R]:** en 60 días de etapa 2 — ≥10 productos "abiertos a ofertas" **y** ≥20 solicitudes de contacto legítimas. Debajo de eso, la compraventa espera.

## 9–12. Posicionamiento, usuarios y flujos

- **Problema:** el maker hispano no tiene dónde lanzar con impacto: PH lo ignora, su red personal no escala.
- **Usuario principal:** maker indie hispanohablante (LATAM + España) construyendo con IA/no-code. **Secundario:** miembro de comunidad que descubre y vota; **terciario (etapa 2+):** comprador de micro-activos.
- **Mercados iniciales:** la comunidad Skool propia → México, España, Argentina, Colombia [S: composición real de la comunidad].
- **Mensaje principal [R]:** *"Lanza tu producto en español. Consigue tus primeros usuarios y feedback real de una comunidad que sí te ve."* (Y en etapa 2: *"…y cuando facture, véndelo aquí mismo."*)
- **Prueba de confianza:** votos de personas reales (sin bots — ya es el pitch), makers con cara y perfil, moderación humana visible.
- **Acción #1 de un usuario nuevo:** votar un lanzamiento (fricción mínima) → publicar el suyo.
- **Razón de volver semanal:** ranking semanal + notificaciones de actividad en tu producto (ya existen) + nuevos lanzamientos de la comunidad.

## 13–15. Alcance del MVP

**Ya construido y verificado [C]:** publicación, página individual, categorías, votos, comentarios, perfiles (propio y público), galería, enlaces, buscador, filtros, moderación, reportes, ranking, notificaciones.

**MVP público = lo anterior +:**
1. Dominio propio + emails reales (T2) — confianza básica.
2. Upstash rate limiting (T1).
3. Legal mínimo revisado (T8).
4. **Puente de compraventa (etapa 2):** 3 campos + 1 formulario + 1 badge.

**Después de validar demanda:** verificación Stripe de MRR, favoritos/guardados, calendario de lanzamientos, etiquetas, alertas para compradores, colecciones.

**Descartar por ahora (sobreconstrucción):** NDA, data room, mensajería interna, valoración automática, escrow, KYC/identidad verificada, ARR/gastos/tráfico detallados, estados de proceso de deal, suscripción de compradores.

## 16. Modelo de negocio (hipótesis, no hechos)

| | A: Lanzamiento destacado | B: Founder Pro | C: Contacto de compraventa |
|---|---|---|---|
| Quién paga | Maker | Maker | Comprador |
| Qué obtiene | Slot destacado 7 días + badge | Destacados + analytics + insignia | Desbloquear contacto del vendedor |
| Precio inicial [S] | $19–29/lanzamiento | $9–19/mes | $29–49/solicitud o paquete |
| Cobro | Manual (Stripe Payment Link) — sin infra | Recurrente (requiere Stripe subs) | Manual al inicio |
| Riesgo | Bajo | Prematuro sin tráfico | Depende de señal etapa 2 |
| Métrica | % makers que pagan | Churn | Solicitudes pagadas/mes |

**Recomendación [R]:** empezar con **A** usando Payment Links manuales (cero infraestructura, valida disposición a pagar). **C** cuando el puente dé señal. **B** solo con tráfico recurrente demostrado. Ninguna comisión por venta hasta tener asesoría legal (§22).

## 17–18. Arquitectura y modelo de datos

**Mantener [C/R]:** stack completo actual (Next 14 + Prisma + Supabase Postgres + NextAuth + Zod), Vercel como deploy (funciona, CI verde, el equipo lo domina). **No migrar a Render/Railway ahora** — la única razón real sería el rate limiter, y Upstash lo resuelve por $0 en el tier libre. Reevaluar solo si aparecen jobs de larga duración (verificación Stripe programada podría vivir en un cron de Vercel o GitHub Actions).

**Cambios propuestos (etapa 2):**
```prisma
// Product: añadir
openToOffers      Boolean  @default(false)
declaredMrrUsd    Int?     // entero, USD/mes, con disclaimer en UI
monetizationNote  String?  // "suscripciones", "ads", etc.

model ContactRequest {
  id        String   @id @default(cuid())
  productId String
  buyerId   String   // usuario registrado (evita spam anónimo)
  message   String   // máx 1000, Zod
  status    RequestStatus @default(PENDING) // PENDING/SHARED/DISMISSED
  createdAt DateTime @default(now())
  @@unique([productId, buyerId]) // 1 solicitud por comprador por producto
  @@index([productId, status])
}
```
Endpoints: extender `updateProductSchema` (3 campos), `POST /api/products/:slug/contact-requests` (auth + rate limit `contactRequest: 5/día`), `GET /api/me/contact-requests` (maker). Email al maker vía Resend. **Sin** mensajería interna: el maker decide compartir su email (status SHARED).

## 19–20. Backlog priorizado y roadmap

**Sprint 0 — Estabilización (pre-lanzamiento comunidad)** *(estimación total: pequeña)*
- LP-01 Dominio + Resend SPF/DKIM — bloquea emails [dueño: Willy compra, agente configura]
- LP-02 Upstash rate limiting (T1) — S
- LP-03 Confirmar backups Supabase + pooler Prisma (T4/T6) — S
- LP-04 Monitoreo (ping health + alerta) + Vercel Analytics — S
- LP-05 Legal mínimo revisado (T8) — S dev, [S] abogado

**Sprint 1 — Lanzamiento comunidad** — publicar kit Skool (listo), extensión aprobada, meta: 10 productos reales, medir votos/lanzamiento.

**Sprint 2 — Puente compraventa (etapa 2)** — LP-06 campos+badge (S), LP-07 ContactRequest+emails (M), LP-08 disclaimer legal métricas (S).

**Sprint 3 — Primer cobro** — LP-09 featured manual con Payment Link (S), LP-10 página "Destacar tu lanzamiento" (S).

**Sprint 4 — solo con señal** — LP-11 verificación Stripe read-only (G), LP-12 ficha de venta estándar (M), LP-13 cobro por contacto (M).

## 21. Métricas de validación

- Activación: % registro→primer voto; % registro→publicación.
- **Liquidez lanzamientos: votos promedio por lanzamiento en 7 días — benchmark honesto: superar 15 (TryLaunch: 1–7 [C]).**
- Retención: % usuarios que vuelven a votar semana 2.
- Señal compraventa: badges "abierto a ofertas", solicitudes de contacto/mes (umbral §8).
- Monetización: % lanzamientos que pagan destacado.

## 22. Legal y operativo (no soy abogado — llevar a uno)

- **MVP:** Términos + Privacidad reales (existen las páginas, falta contenido válido); política de moderación; borrado de cuenta (ya existe técnica y funcionalmente).
- **Antes de cobrar:** entidad legal + facturación (¿país?), términos de pago, impuestos.
- **Antes de facilitar transacciones:** disclaimer duro en métricas declaradas ("no verificadas; responsabilidad del publicante"); estructura de "tablón de anuncios" SIN intermediar el deal (Acquire tiene licencia de brokerage CA DRE [C] — señal de que intermediar en serio exige licencias); cierres derivados a escrow de terceros; prohibición de listar activos que no poseen.
- **Maduro:** KYC/AML solo si algún día tocan el dinero de las transacciones (recomendación: nunca directamente).

## 23. Plan de implementación (cuando autoricen)

Rama por sprint (`sprint-0-estabilizacion`, …), PRs pequeños, tests+typecheck+build en cada uno, sin tocar main directo, migraciones aditivas nunca destructivas, env documentado en `.env.example`, resumen de archivos y cómo probar en cada PR. Cambios sensibles (auth, cookies, CORS, extensión) con nota de impacto previa — igual que se trabajó hoy.

## 24. Recomendación final

**No construyan el marketplace de compraventa todavía.** Ya tienen el 90% del producto correcto construido y verificado. La secuencia ganadora: dominio + estabilización (días) → lanzamiento con la comunidad (la ÚNICA ventaja competitiva real que PH/Acquire/TrustMRR no tienen: distribución hispana propia) → puente de validación (1 semana) → decidir compraventa CON datos, no con fe. Si el puente da señal, el camino es TrustMRR-style (software, Stripe, sin escrow), no Acquire-style (operación pesada y regulada).

## 25. Las 10 decisiones de los socios

1. **Nombre definitivo y dominio** (bloquea emails, marca, SEO; "skool-co" usa marca ajena).
2. Adoptar (o no) la **estrategia por etapas** de este documento.
3. **Umbral de señal** para construir compraventa (propuesta: 10 badges + 20 solicitudes / 60 días).
4. Primer experimento de **cobro** (¿featured a $19–29? ¿desde cuándo?).
5. **Alcance inicial**: ¿solo la comunidad Skool o todo maker hispano desde el día 1?
6. **Métricas declaradas**: ¿publicarlas con disclaimer ya, o esperar verificación?
7. **Infraestructura**: quedarse en Vercel + Upstash (recomendado) vs migrar.
8. **Curación**: criterios de calidad para aceptar lanzamientos y quién modera.
9. **Entidad legal y país** para cobrar y publicar términos reales.
10. **Reparto operativo**: quién hace growth/comunidad, quién modera, quién desarrolla.

---
*Preparado con evidencia recogida el 12-jul-2026. Fase 1 completa — no se modificó código para este análisis. Esperando autorización de los socios para ejecutar Sprint 0.*
