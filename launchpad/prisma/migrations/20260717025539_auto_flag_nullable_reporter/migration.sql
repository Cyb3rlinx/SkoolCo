-- AlterTable
-- reporter_id se vuelve nullable: NULL representa un reporte auto-generado
-- por el sistema (detección de contenido sospechoso), no un reporte de usuario.
ALTER TABLE "moderation_reports" ALTER COLUMN "reporter_id" DROP NOT NULL;
