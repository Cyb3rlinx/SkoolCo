import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { AuthGate } from "@/components/layout/auth-gate";
import { AdminClient } from "./admin-client";

export const metadata: Metadata = { title: "Administración" };

/**
 * Moderation console (placeholder scope for the MVP).
 * Role-gated on the client (AuthGate requireStaff) AND on the API
 * (requireModerator) — the UI gate is convenience, the API gate is security.
 */
export default function AdminPage() {
  return (
    <div className="container-page space-y-8 py-10">
      <PageHeader
        title="Panel de administración"
        description="Métricas del negocio, gestión de usuarios y productos, y moderación de la comunidad."
      />
      <AuthGate requireStaff>
        <AdminClient />
      </AuthGate>
    </div>
  );
}
