import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/layout/prose-page";

export const metadata: Metadata = {
  title: "Términos de uso",
  description: "Las reglas de uso de Denveler, claras y sin letra pequeña.",
};

export default function TerminosPage() {
  return (
    <ProsePage title="Términos de uso" updated="13 de julio de 2026">
      <p>
        Al crear una cuenta en Denveler aceptas estos términos. Son cortos a propósito: queremos
        que los leas de verdad.
      </p>

      <h2>El servicio</h2>
      <p>
        Denveler permite publicar productos, recibir votos y comentarios de la comunidad y ganar
        visibilidad. Es un servicio en evolución (MVP): puede cambiar, tener errores o
        interrumpirse; lo ofrecemos “tal cual”, sin garantías de disponibilidad.
      </p>

      <h2>Tu cuenta</h2>
      <ul>
        <li>Eres responsable de lo que se haga con tu cuenta y de mantener tu contraseña segura.</li>
        <li>Una persona, una cuenta. Las cuentas para inflar votos se eliminan.</li>
        <li>Puedes eliminar tu cuenta cuando quieras desde tu perfil.</li>
      </ul>

      <h2>Tu contenido</h2>
      <ul>
        <li>
          Lo que publicas (productos, comentarios, imágenes) sigue siendo tuyo. Nos das permiso
          para mostrarlo en la plataforma, que es para lo que lo publicaste.
        </li>
        <li>Solo publica lo que tengas derecho a publicar (nada de logos o imágenes ajenas).</li>
        <li>
          Podemos retirar contenido que infrinja las{" "}
          <Link href="/normas" className="font-semibold text-primary hover:underline">
            normas de la comunidad
          </Link>{" "}
          o la ley, y suspender cuentas que reincidan.
        </li>
      </ul>

      <h2>Votos y reputación</h2>
      <p>
        El valor de Denveler es que los votos son de personas reales. Comprar votos, usar bots,
        cuentas múltiples o intercambios de votos (“vota y te voto”) está prohibido y es causa de
        eliminación de cuenta.
      </p>

      <h2>La extensión</h2>
      <p>
        La extensión “Logros” es opcional y funciona solo con tu clic. Eres responsable de usarla
        respetando las reglas de las plataformas donde participas.
      </p>

      <h2>Responsabilidad</h2>
      <p>
        Los productos publicados pertenecen a sus makers; Denveler no garantiza su calidad ni se
        hace responsable de acuerdos entre usuarios. En la medida que permita la ley, nuestra
        responsabilidad se limita al uso gratuito del servicio.
      </p>

      <h2>Cambios</h2>
      <p>
        Si cambiamos estos términos de forma relevante, actualizaremos la fecha y lo anunciaremos
        en la plataforma. Seguir usando Denveler después implica aceptar la versión nueva.
      </p>
    </ProsePage>
  );
}
