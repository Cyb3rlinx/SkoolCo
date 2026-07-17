import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ProsePage } from "@/components/layout/prose-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.about");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

function EsContent() {
  return (
    <>
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
      <p>Studio Monk OÜ es una sociedad registrada en Estonia bajo el código de registro 17310242.</p>
      <p>
        Domicilio social:
        <br />
        Harju maakond, Tallinn, Kesklinna linnaosa,
        <br />
        Järvevana tee 9, 11314, Estonia.
      </p>
    </>
  );
}

function EnContent() {
  return (
    <>
      <p>
        Denveler is a platform built to help entrepreneurs, makers, and digital teams launch their
        products, connect with communities, and get visibility, feedback, and support from the
        earliest stages.
      </p>
      <p>
        The platform is operated by <strong>Studio Monk OÜ</strong>, a technology, media, and
        digital-venture-building company based in Estonia.
      </p>

      <h2>About Studio Monk</h2>
      <p>
        Studio Monk develops, operates, and scales brands, platforms, and products built for the
        internet. Its work combines technology, strategy, market research, content creation,
        branding, and digital distribution to build businesses capable of operating in global
        markets.
      </p>
      <p>
        The company's portfolio includes software products, information and data-analytics
        platforms, consumer brands, e-commerce projects, digital media, educational products, and
        specialized communities.
      </p>
      <p>
        Each project operates under an independent identity, with its own value proposition and
        audience. Studio Monk acts as the parent company and strategic partner, centralizing the
        resources needed to drive their development:
      </p>
      <ul>
        <li>Business strategy and development.</li>
        <li>Technology infrastructure.</li>
        <li>Product and brand design.</li>
        <li>Marketing and digital distribution.</li>
        <li>Operations and growth support.</li>
        <li>Market research and data intelligence.</li>
      </ul>
      <p>
        This model lets each initiative keep its independence while benefiting from a shared
        structure of expertise, technology, and operations.
      </p>

      <h2>Our vision</h2>
      <p>
        We believe the best digital companies are born from a combination of good ideas, accessible
        technology, consistent execution, and communities capable of supporting their growth.
      </p>
      <p>
        Our mission is to turn those ideas into useful, sustainable, scalable products that solve
        real problems and create value for people around the world.
      </p>

      <h2>Corporate information</h2>
      <p>Denveler is a service operated by Studio Monk OÜ.</p>
      <p>Studio Monk OÜ is a company registered in Estonia under registration code 17310242.</p>
      <p>
        Registered address:
        <br />
        Harju maakond, Tallinn, Kesklinna linnaosa,
        <br />
        Järvevana tee 9, 11314, Estonia.
      </p>
    </>
  );
}

function ZhContent() {
  return (
    <>
      <p>
        Denveler 是一个致力于帮助创业者、创作者和数字团队发布产品、连接社区，并从最早期阶段就获得关注度、反馈和支持的平台。
      </p>
      <p>
        该平台由 <strong>Studio Monk OÜ</strong> 运营，这是一家总部位于爱沙尼亚的科技、媒体与数字创投公司。
      </p>

      <h2>关于 Studio Monk</h2>
      <p>
        Studio Monk 开发、运营并扩展面向互联网的品牌、平台和产品。其业务融合了技术、战略、市场调研、内容创作、品牌塑造和数字化分发，旨在打造能够在全球市场运营的业务。
      </p>
      <p>
        公司的业务组合包括软件产品、信息与数据分析平台、消费品牌、电子商务项目、数字媒体、教育产品以及垂直社区。
      </p>
      <p>
        每个项目都以独立的身份运营，拥有各自的价值主张和受众。Studio Monk 作为母公司和战略伙伴，集中提供推动其发展所需的资源：
      </p>
      <ul>
        <li>业务战略与拓展。</li>
        <li>技术基础设施。</li>
        <li>产品与品牌设计。</li>
        <li>市场营销与数字分发。</li>
        <li>运营与增长支持。</li>
        <li>市场调研与数据智能。</li>
      </ul>
      <p>这种模式让每个项目都能保持独立性，同时受益于共享的专业能力、技术和运营体系。</p>

      <h2>我们的愿景</h2>
      <p>我们相信，最优秀的数字公司诞生于好的创意、易获取的技术、持续的执行力，以及能够支持其成长的社区这几者的结合。</p>
      <p>我们的使命是将这些创意转化为有用、可持续、可扩展的产品，解决真实问题，并为全世界的人创造价值。</p>

      <h2>公司信息</h2>
      <p>Denveler 是由 Studio Monk OÜ 运营的服务。</p>
      <p>Studio Monk OÜ 是一家在爱沙尼亚注册的公司，注册代码为 17310242。</p>
      <p>
        注册地址：
        <br />
        Harju maakond, Tallinn, Kesklinna linnaosa,
        <br />
        Järvevana tee 9, 11314, Estonia.
      </p>
    </>
  );
}

export default async function AcercaPage() {
  const locale = await getLocale();
  const t = await getTranslations("legal.about");

  return (
    <ProsePage title={t("pageTitle")} updated={t("updated")}>
      {locale === "en" ? <EnContent /> : locale === "zh" ? <ZhContent /> : <EsContent />}
    </ProsePage>
  );
}
