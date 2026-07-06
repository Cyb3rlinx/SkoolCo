import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { AuthGate } from "@/components/layout/auth-gate";
import { SubmitLaunchForm } from "@/components/forms/submit-launch-form";

export const metadata: Metadata = {
  title: "Publicar producto",
  description: "Lanza tu proyecto a la comunidad: votos, feedback y visibilidad.",
};

export default function SubmitPage() {
  return (
    <div className="container-page space-y-8 py-10">
      <PageHeader
        title="Publica tu lanzamiento"
        description="Comparte lo que construiste. La comunidad vota, comenta y te ayuda a mejorar."
      />
      <AuthGate
        title="Crea tu cuenta para lanzar"
        description="Solo toma un minuto. Tu producto quedará ligado a tu perfil de maker."
      >
        <SubmitLaunchForm />
      </AuthGate>
    </div>
  );
}
