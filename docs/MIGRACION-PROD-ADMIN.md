# 🗄️ Migración de producción — Dashboard de administración

**Willy: pegar TODO el bloque SQL de abajo en el SQL Editor de Supabase** (proyecto `skoolco`, base `main`/producción) → **Run** → debe decir **"Success. No rows returned"**.

Correr esto **ANTES de mergear el PR** de la rama `admin-dashboard`. Es aditiva: agrega una columna nullable a `users`, no toca ni borra nada.

## Verificación previa (opcional, solo lectura)

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'suspended_at';
```

Si devuelve 0 filas, la migración todavía no se aplicó — sigue con el bloque de abajo.

## Migración completa (copiar todo el bloque)

```sql
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "suspended_at" TIMESTAMP(3);

INSERT INTO "_prisma_migrations"
  (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES
  (gen_random_uuid(), '8523e561c8040087971e57a89c3d032b21ce5f3ae65faf134d3ad240c616c4ce',
   now(), '20260716205055_add_user_suspension', NULL, NULL, now(), 1);
```

## Verificación posterior

```sql
SELECT migration_name FROM _prisma_migrations WHERE migration_name LIKE '%add_user_suspension%';
```

Debe devolver **1 fila**. Con eso, producción queda lista para el redeploy de Vercel (automático al mergear el PR).

## Después de mergear

1. Vercel despliega solo (push a `main` dispara el deploy).
2. Si todavía no se corrió, promover a los administradores:
   ```sql
   UPDATE users SET role = 'ADMIN'
   WHERE email IN ('willydiaz9009@gmail.com', 'keev.seven@hotmail.com');
   ```
3. Verificación rápida: `curl -i https://denveler.com/api/admin/stats` (sin sesión) debe devolver **401**.
4. Entrar a **denveler.com/admin** con tu cuenta: deben verse 5 pestañas (Resumen, Usuarios, Productos, Reportes, Logros de la extensión) y las métricas cargando.
