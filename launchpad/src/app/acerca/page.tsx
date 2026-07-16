import type { Metadata } from "next";
import { ProsePage } from "@/components/layout/prose-page";

export const metadata: Metadata = {
  title: "Acerca de",
  description:
    "Denveler es la plataforma donde nacen nuevos productos y los creadores se conectan. Operada por Studio Monk OÜ.",
};

export default function AcercaPage() {
  return (
    <ProsePage title="Acerca de Denveler" updated="16 de julio de 2026">
      <p>
        Denveler es una plataforma creada para ayudar a emprendedores, makers y equipos digitales
        a lanzar sus productos, conectar con comunidades y obtener visibilidad, feedback y apoyo
        desde las primeras etapas.
      </p>
      <p>
        La plataforma es operada por <strong>Studio Monk OÜ</strong>, una compañía tecnológica, de
        medios y creación de ventures digitales con sede en Estonia.
      </p>

      <h2>Sobre Studio Monk</h2>
      <p>
        Studio Monk desarrolla, opera y escala marcas, plataformas y productos diseñados para
        internet. Su actividad combina tecnología, estrategia, investigación de mercados, creación
        de contenido, branding y distribución digital para construir negocios capaces de operar en
        mercados globales.
      </p>
      <p>
        El portafolio de la compañía incluye productos de software, plataformas de información y
        análisis de datos, marcas de consumo, proyectos de comercio electrónico, medios digitales,
        productos educativos y comunidades especializadas.
      </p>
      <p>
        Cada proyecto opera bajo una identidad independiente, con su propia propuesta de valor y
        audiencia. Studio Monk actúa como empresa matriz y socio estratégico, centralizando los
        recursos necesarios para impulsar su desarrollo:
      </p>
      <ul>
        <li>Estrategia y desarrollo de negocio.</li>
        <li>Infraestructura tecnológica.</li>
        <li>Diseño de producto y marca.</li>
        <li>Marketing y distribución digital.</li>
        <li>Operaciones y soporte de crecimiento.</li>
        <li>Investigación de mercados e inteligencia de datos.</li>
      </ul>
      <p>
        Este modelo permite que cada iniciativa mantenga su independencia mientras se beneficia de
        una estructura compartida de experiencia, tecnología y operaciones.
      </p>

      <h2>Nuestra visión</h2>
      <p>
        Creemos que las mejores compañías digitales nacen de una combinación de buenas ideas,
        tecnología accesible, ejecución constante y comunidades capaces de apoyar su crecimiento.
      </p>
      <p>
        Nuestra misión es convertir esas ideas en productos útiles, sostenibles y escalables que
        resuelvan problemas reales y generen valor para personas de todo el mundo.
      </p>

      <h2>Información corporativa</h2>
      <p>Denveler es un servicio operado por Studio Monk OÜ.</p>
      <p>
        Studio Monk OÜ es una sociedad registrada en Estonia bajo el código de registro 17310242.
      </p>
      <p>
        Domicilio social:
        <br />
        Harju maakond, Tallinn, Kesklinna linnaosa,
        <br />
        Järvevana tee 9, 11314, Estonia.
      </p>
    </ProsePage>
  );
}
