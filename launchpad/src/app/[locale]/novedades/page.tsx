import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/layout/prose-page";

export const metadata: Metadata = {
  title: "Novedades",
  description: "Qué hay de nuevo en Denveler: cambios, mejoras y lanzamientos de la plataforma.",
};

export default function NovedadesPage() {
  return (
    <ProsePage title="Novedades" updated="16 de julio de 2026">
      <p>
        Todo lo que va cambiando en Denveler, en orden cronológico. Construimos en público — el
        feedback sobre cualquiera de estas novedades es bienvenido en{" "}
        <Link href="/contacto" className="font-semibold text-primary hover:underline">
          contacto
        </Link>
        .
      </p>

      <h2>16 de julio de 2026</h2>
      <ul>
        <li>
          <strong>Lanzamientos por zona horaria, arreglado:</strong> los productos publicados
          &ldquo;hoy&rdquo; desde cualquier parte del mundo ya aparecen correctamente en
          &ldquo;Lanzamientos de hoy&rdquo;.
        </li>
        <li>
          <strong>Página Acerca de:</strong> quiénes somos y quién opera la plataforma.
        </li>
        <li>
          <strong>Nuevas páginas de ayuda:</strong> centro de ayuda, guía de lanzamiento y este
          mismo changelog.
        </li>
      </ul>

      <h2>13–14 de julio de 2026</h2>
      <ul>
        <li>
          <strong>Puente de compraventa:</strong> los makers pueden marcar su producto como
          &ldquo;Abierto a ofertas&rdquo;, declarar su MRR y recibir solicitudes de contacto de
          interesados. Sin intermediarios: el maker decide si comparte su email.
        </li>
        <li>
          <strong>Señal de interés:</strong> el maker ve cuántas veces se vio su oferta, y los
          productos con tracción reciben una invitación para abrirse a ofertas.
        </li>
        <li>
          <strong>Emails transaccionales:</strong> recuperación de contraseña, verificación y
          notificaciones del puente de compraventa, ya con dominio propio.
        </li>
      </ul>

      <h2>12 de julio de 2026</h2>
      <ul>
        <li>
          <strong>Denveler es Denveler:</strong> nueva marca, nuevo logo y dominio propio
          (denveler.com). Antes nos conocías como LaunchPad.
        </li>
        <li>
          <strong>Extensión de Chrome &ldquo;Denveler — Logros&rdquo;:</strong> comparte los
          logros públicos de tu comunidad al muro de Denveler con un clic.{" "}
          <Link href="/extension" className="font-semibold text-primary hover:underline">
            Conoce cómo funciona
          </Link>
          .
        </li>
        <li>
          <strong>Galería de imágenes:</strong> cada producto puede mostrar hasta 5 capturas.
        </li>
      </ul>

      <h2>Julio de 2026 — el comienzo</h2>
      <ul>
        <li>
          <strong>Nace la plataforma:</strong> publica tu producto, recibe votos honestos y
          feedback real de la comunidad. Ranking, comentarios, perfiles de maker, notificaciones
          y moderación humana desde el día uno.
        </li>
      </ul>
    </ProsePage>
  );
}
