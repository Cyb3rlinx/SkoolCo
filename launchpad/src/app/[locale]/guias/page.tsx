import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/layout/prose-page";

export const metadata: Metadata = {
  title: "Guías",
  description: "Cómo hacer un buen lanzamiento en Denveler, paso a paso.",
};

export default function GuiasPage() {
  return (
    <ProsePage title="Guía: un buen lanzamiento en Denveler" updated="16 de julio de 2026">
      <p>
        Publicar toma 5 minutos. Publicar <em>bien</em> toma 30 — y la diferencia se nota en los
        votos, el feedback y las oportunidades que llegan después. Esta es la checklist que
        usamos nosotros mismos.
      </p>

      <h2>Antes de publicar</h2>
      <ul>
        <li>
          <strong>Un tagline que se entienda en 3 segundos.</strong> Di qué hace y para quién:
          &ldquo;Facturas automáticas para freelancers&rdquo; gana contra &ldquo;La revolución de
          la productividad&rdquo;.
        </li>
        <li>
          <strong>Descripción honesta:</strong> qué problema resuelve, para quién es, qué lo hace
          distinto, y qué feedback buscas de la comunidad. Esa última parte multiplica los
          comentarios útiles.
        </li>
        <li>
          <strong>Logo y capturas reales.</strong> Un producto sin capturas recibe menos clicks.
          Puedes subir hasta 5 imágenes en la galería.
        </li>
        <li>
          <strong>El sitio funcionando.</strong> Antes de publicar, prueba tu link en una ventana
          de incógnito: la gente SÍ va a hacer clic.
        </li>
      </ul>

      <h2>El día del lanzamiento</h2>
      <ul>
        <li>
          <strong>Publica temprano en tu zona horaria.</strong> Tu producto compite en
          &ldquo;Lanzamientos de hoy&rdquo; — más horas visible, más votos.
        </li>
        <li>
          <strong>Comparte el link directo de tu producto</strong> en tu comunidad, tus redes y
          tus grupos. Pide feedback, no votos: el feedback trae votos solos.
        </li>
        <li>
          <strong>Responde cada comentario.</strong> Los makers que conversan reciben más votos y
          más segundas visitas. Y la comunidad lo nota.
        </li>
      </ul>

      <h2>Después del lanzamiento</h2>
      <ul>
        <li>
          <strong>Comparte tus logros con la extensión.</strong> ¿Tu post de lanzamiento explotó
          en tu comunidad? Envíalo al muro de logros con la{" "}
          <Link href="/extension" className="font-semibold text-primary hover:underline">
            extensión de Chrome
          </Link>
          .
        </li>
        <li>
          <strong>Considera abrirte a ofertas.</strong> Si tu producto ya factura y te interesa
          venderlo (o recibir propuestas), activa &ldquo;Abierto a ofertas&rdquo; desde la página
          de tu producto y declara tu MRR. Los interesados podrán pedirte el contacto.
        </li>
        <li>
          <strong>Itera con el feedback.</strong> Vuelve a los comentarios en una semana: ahí está
          tu roadmap gratis.
        </li>
      </ul>

      <p>
        ¿Listo?{" "}
        <Link href="/submit" className="font-semibold text-primary hover:underline">
          Publica tu producto
        </Link>
        .
      </p>
    </ProsePage>
  );
}
