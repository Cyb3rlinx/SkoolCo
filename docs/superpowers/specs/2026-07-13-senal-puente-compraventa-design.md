# Señal del puente de compraventa — Design

**Contexto:** la Fase 2 (puente de compraventa: campos declarados + `ContactRequest`) ya está en producción. Según el roadmap de `docs/ESTRATEGIA-AUDITORIA-2026-07.md` (§19-20, §24), el paso siguiente NO es construir la Fase 3 (compraventa con pago) todavía — es generar más señal real (badges "abierto a ofertas" activos + solicitudes de contacto/mes, la métrica de validación definida en §21) antes de decidir si esa fase se justifica.

Este spec cubre dos features chicas e independientes que ayudan a generar esa señal, sin tocar nada de pagos/escrow/mensajería (fuera de alcance, igual que en la Fase 2):

1. **Contador de vistas** en la oferta de un producto — el maker ve que hay interés real, aunque nadie le haya escrito todavía.
2. **Email de invitación por tracción** — a los makers con productos que ya tienen votos pero no activaron "abierto a ofertas", se les avisa que pueden hacerlo.

## Feature 1 — Contador de vistas

### Qué hace

Cada vez que alguien que **no es el maker** del producto carga la página de detalle de un producto con `openToOffers=true`, se suma 1 a un contador. El maker lo ve en su propio panel de configuración de oferta. Sin deduplicar (cuenta visitas repetidas del mismo visitante), sin tabla nueva — un contador simple.

### Datos

Un campo nuevo en `Product`:

```prisma
offerViewCount Int @default(0) @map("offer_view_count")
```

Migración additive-only (agrega una columna con default, no toca datos existentes).

### Dónde se incrementa

En el handler existente `GET /api/products/[slug]/route.ts`. Después de resolver el producto y antes de devolver la respuesta:

```
si product.openToOffers === true
   Y (no hay sesión, O session.user.id !== product.makerId)
entonces: prisma.product.update({ where: { id }, data: { offerViewCount: { increment: 1 } } })
```

El incremento va en un `try/catch` propio — si falla, se loguea con `console.error` y la respuesta al usuario sigue siendo exitosa (mismo patrón que ya usamos para los emails: un efecto secundario nunca debe tumbar la respuesta principal).

**Por qué no hay riesgo de sobre-contar dentro de una misma visita:** revisé `UpvoteButton`, `CommentSection` y `ProductGallery` — ninguno dispara el `refetch()` del producto completo (`product-detail-client.tsx`); cada uno maneja su propio estado o su propio `refetch` acotado a su sub-recurso. El único `refetch()` del producto completo lo disparan `ChangeLogoButton`, `ProductGallery` (`onChanged`) y `OfferSettings` (`onUpdated`) — los tres son componentes **maker-only** que ya devuelven `null` para no-makers. Entonces un comprador que visita la página dispara exactamente un `GET` (un +1), nunca varios por accidente.

### Dónde se ve

El campo se agrega al `select` existente del `GET` (visible para cualquiera que pida el producto, igual que `declaredMrrUsd`/`monetizationNote` hoy — no es información sensible). Se agrega a `ProductDetail` en `src/lib/frontend/types.ts`.

Se **renderiza** solo dentro de `OfferSettings` (`src/components/product/offer-settings.tsx`), que ya hace el gate `session?.user?.id !== makerId → return null`. Texto simple: "👀 {offerViewCount} vistas en tu oferta" (o "Todavía nadie vio tu oferta" si es 0), en español neutro, sin voseo.

### Testing

Test de integración nuevo en `tests/integration/flows.test.ts` (mismo patrón que los flujos existentes — route handler real contra Postgres real):
- Un comprador (no maker) hace `GET` sobre un producto `openToOffers=true` → `offerViewCount` sube en 1.
- El maker hace `GET` sobre su propio producto → `offerViewCount` NO cambia.
- Un visitante anónimo (sin sesión) hace `GET` sobre un producto `openToOffers=true` → `offerViewCount` sube en 1.

## Feature 2 — Email de invitación por tracción

### Qué hace

Un cron diario revisa productos que ya tienen tracción (10+ votos) pero todavía no activaron "abierto a ofertas", y le manda un email al maker invitándolo a activarlo. Se manda **una sola vez por producto**, nunca se repite.

### Datos

Un campo nuevo en `Product`:

```prisma
offerNudgeSentAt DateTime? @map("offer_nudge_sent_at")
```

`null` hasta que se envía el email; se setea a la fecha de envío y nunca se vuelve a tocar (evita reenvíos).

### Quién califica

Función pura y testeable (sin DB, sin red) en `src/lib/offer-nudge.ts`:

```ts
export function selectOfferNudgeCandidates(
  products: { id: string; upvoteCount: number; status: string; openToOffers: boolean; offerNudgeSentAt: Date | null }[]
): typeof products {
  return products.filter(
    (p) =>
      p.status === "LIVE" &&
      !p.openToOffers &&
      p.offerNudgeSentAt === null &&
      p.upvoteCount >= 10
  );
}
```

El umbral (10 votos) es un literal con nombre (`OFFER_NUDGE_UPVOTE_THRESHOLD = 10`), no un número mágico repetido.

### El cron

Nuevo endpoint `GET /api/cron/offer-nudge/route.ts`:

1. Verifica el header `Authorization: Bearer ${process.env.CRON_SECRET}` — si `CRON_SECRET` está seteado y no coincide, `401`. Si `CRON_SECRET` no está seteado (dev local), no exige auth — mismo patrón "modo dev sin config" que ya usa `sendEmail` con `RESEND_API_KEY`.
2. Trae productos candidatos: `prisma.product.findMany({ where: { status: "LIVE", openToOffers: false, offerNudgeSentAt: null }, include: { _count: { select: { upvotes: true } }, maker: { select: { name: true, email: true } } } })`.
3. Mapea a la forma que espera `selectOfferNudgeCandidates` (usando `_count.upvotes` como `upvoteCount`) y filtra con la función pura.
4. Para cada candidato: manda el email (`sendOfferNudgeEmail`, nueva función en `offer-emails.ts`, mismo patrón de escapado `esc()` que las otras dos), envuelto en su propio `try/catch` — si un email falla, no debe frenar el resto del lote. Si el envío no lanzó error, marca `offerNudgeSentAt: new Date()`.
5. Devuelve `{ data: { checked: N, sent: M } }` para verlo en los logs del cron.

Registro del cron en `vercel.json` (nuevo archivo, no existe todavía):

```json
{
  "crons": [{ "path": "/api/cron/offer-nudge", "schedule": "0 14 * * *" }]
}
```

(14:00 UTC ≈ mañana en horario latinoamericano típico.)

### Contenido del email

Mismo estilo que `sendContactRequestNotification`/`sendContactSharedNotification`: asunto tipo "Tu producto {productName} está generando interés", cuerpo explicando que tiene {upvoteCount} votos y que puede activar "abierto a ofertas" desde la página de su producto, con link directo a `{baseUrl}/products/{slug}`. Español neutro, sin voseo. Todo interpolado con `esc()`.

### Testing

- Unit test (TDD) para `selectOfferNudgeCandidates` en `src/lib/offer-nudge.test.ts`: casos de umbral exacto (9 vs 10 vs 11 votos), ya tiene `openToOffers=true` (excluido), ya tiene `offerNudgeSentAt` seteado (excluido), status no-LIVE (excluido).
- Test de integración del endpoint del cron en `tests/integration/flows.test.ts`: request sin `Authorization` correcto → 401 (cuando `CRON_SECRET` está seteado en el test); request autorizado → marca `offerNudgeSentAt` en los productos que califican y no toca los que no.

## Fuera de alcance (igual que la Fase 2)

- Nada de precios, negociación, escrow, ni mensajería interna.
- El contador de vistas no diferencia visitantes únicos ni trackea de dónde vienen — es una señal simple, no analytics.
- El email de tracción se manda una sola vez por producto para siempre; si el maker lo ignora, no hay reintento ni escalamiento.
- No se agrega ninguna integración con n8n — es lógica interna de un solo sistema (DB propia + Resend, ya integrado), no hay plomería entre apps de terceros que lo justifique.

## Migración

Igual ritual que la Fase 2: `prisma migrate dev` local, y un doc `docs/MIGRACION-PROD-FASE3-SIGNAL.md` con el SQL exacto + el `INSERT` manual en `_prisma_migrations` para correr en el SQL Editor de Supabase antes de mergear el PR. Additive-only (dos columnas nuevas con default/nullable, nada se borra ni se altera).
