import type { Metadata } from "next";
import { AuthGate } from "@/components/layout/auth-gate";
import { ProfileClient } from "./profile-client";

export const metadata: Metadata = { title: "Mi perfil" };

export default function ProfilePage() {
  return (
    <div className="container-page py-10">
      <AuthGate
        title="Tu perfil te espera"
        description="Inicia sesión para ver tus lanzamientos, estadísticas y ajustes."
      >
        <ProfileClient />
      </AuthGate>
    </div>
  );
}
