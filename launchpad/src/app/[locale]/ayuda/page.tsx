import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/layout/prose-page";

export const metadata: Metadata = {
  title: "Centro de ayuda",
  description: "Respuestas rápidas a las preguntas más comunes sobre Denveler.",
};

export default function AyudaPage() {
  return (
    <ProsePage title="Centro de ayuda" updated="16 de julio de 2026">
      <p>
        Respuestas rápidas a lo que más nos preguntan. Si no encuentras la tuya,{" "}
        <Link href="/contacto" className="font-semibold text-primary hover:underline">
          escríbenos
        </Link>{" "}
        y te ayudamos.
      </p>

      <h2>¿Cómo publico mi producto?</h2>
      <p>
        Crea tu cuenta, entra a{" "}
        <Link href="/submit" className="font-semibold text-primary hover:underline">
          Publicar
        </Link>{" "}
        y completa el formulario: nombre, una frase que lo describa, descripción, categoría, fecha
        de lanzamiento y (opcional) logo y capturas. Puedes guardarlo como borrador y publicarlo
        cuando estés listo.
      </p>

      <h2>¿Cómo funcionan los votos?</h2>
      <p>
        Un voto por persona por producto, y puedes quitarlo cuando quieras. Los votos son de
        personas reales: comprar votos, usar bots o hacer intercambios (&ldquo;vota y te
        voto&rdquo;) va contra las{" "}
        <Link href="/normas" className="font-semibold text-primary hover:underline">
          normas
        </Link>{" "}
        y es causa de eliminación de cuenta.
      </p>

      <h2>¿Cómo uso la extensión de Chrome?</h2>
      <p>
        Instálala desde la página{" "}
        <Link href="/extension" className="font-semibold text-primary hover:underline">
          Extensión
        </Link>
        , inicia sesión en Denveler en ese navegador, abre un post público de logro en tu
        comunidad y haz clic en el ícono de la extensión. El logro queda pendiente hasta que un
        moderador lo verifica, y luego aparece en el muro público.
      </p>

      <h2>¿Qué significa “Abierto a ofertas”?</h2>
      <p>
        Es una señal opcional del maker: indica que le interesa recibir solicitudes de compra por
        su producto. Las métricas que declara (como el MRR) no las verifica Denveler, y cualquier
        conversación o acuerdo posterior ocurre fuera de la plataforma, directamente entre las
        partes.
      </p>

      <h2>¿Cómo pido el contacto de un maker?</h2>
      <p>
        Si un producto está abierto a ofertas, verás el botón <strong>Solicitar contacto</strong>{" "}
        en su página. Escribe un mensaje breve explicando tu interés; el maker decide si comparte
        su email contigo. Una solicitud por producto.
      </p>

      <h2>¿Cómo elimino mi cuenta?</h2>
      <p>
        Desde tu{" "}
        <Link href="/profile" className="font-semibold text-primary hover:underline">
          perfil
        </Link>
        , al final de la página encontrarás la opción para eliminar tu cuenta y todo tu contenido.
        Es inmediato e irreversible.
      </p>

      <h2>Encontré un error o contenido que no debería estar</h2>
      <p>
        Usa el botón <strong>Reportar</strong> en la página del producto, o{" "}
        <Link href="/contacto" className="font-semibold text-primary hover:underline">
          escríbenos
        </Link>{" "}
        directamente. El equipo de moderación revisa todos los reportes.
      </p>
    </ProsePage>
  );
}
