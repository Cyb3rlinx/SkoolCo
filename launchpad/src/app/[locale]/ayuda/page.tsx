import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ProsePage } from "@/components/layout/prose-page";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("help");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

function EsContent() {
  return (
    <>
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
        personas reales: comprar votos, usar bots o hacer intercambios ("vota y te voto") va
        contra las{" "}
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

      <h2>¿Qué significa "Abierto a ofertas"?</h2>
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
    </>
  );
}

function EnContent() {
  return (
    <>
      <p>
        Quick answers to what we get asked most. Can't find yours?{" "}
        <Link href="/contacto" className="font-semibold text-primary hover:underline">
          Write to us
        </Link>{" "}
        and we'll help.
      </p>

      <h2>How do I publish my product?</h2>
      <p>
        Create your account, go to{" "}
        <Link href="/submit" className="font-semibold text-primary hover:underline">
          Publish
        </Link>{" "}
        and fill out the form: name, a one-line tagline, description, category, launch date, and
        (optionally) a logo and screenshots. You can save it as a draft and publish when you're
        ready.
      </p>

      <h2>How do votes work?</h2>
      <p>
        One vote per person per product, and you can remove it whenever you want. Votes come from
        real people: buying votes, using bots, or trading them ("vote for vote") violates the{" "}
        <Link href="/normas" className="font-semibold text-primary hover:underline">
          guidelines
        </Link>{" "}
        and is grounds for account removal.
      </p>

      <h2>How do I use the Chrome extension?</h2>
      <p>
        Install it from the{" "}
        <Link href="/extension" className="font-semibold text-primary hover:underline">
          Extension
        </Link>{" "}
        page, sign in to Denveler in that browser, open a public achievement post in your
        community, and click the extension icon. The achievement stays pending until a moderator
        verifies it, then it appears on the public wall.
      </p>

      <h2>What does "Open to offers" mean?</h2>
      <p>
        It's an optional signal from the maker: it means they're interested in receiving purchase
        requests for their product. Metrics they declare (like MRR) aren't verified by Denveler,
        and any subsequent conversation or agreement happens off-platform, directly between the
        parties.
      </p>

      <h2>How do I request a maker's contact info?</h2>
      <p>
        If a product is open to offers, you'll see a <strong>Request contact</strong> button on its
        page. Write a short message explaining your interest; the maker decides whether to share
        their email with you. One request per product.
      </p>

      <h2>How do I delete my account?</h2>
      <p>
        From your{" "}
        <Link href="/profile" className="font-semibold text-primary hover:underline">
          profile
        </Link>
        , at the bottom of the page you'll find the option to delete your account and all your
        content. It's immediate and irreversible.
      </p>

      <h2>I found a bug or content that shouldn't be there</h2>
      <p>
        Use the <strong>Report</strong> button on the product page, or{" "}
        <Link href="/contacto" className="font-semibold text-primary hover:underline">
          write to us
        </Link>{" "}
        directly. The moderation team reviews every report.
      </p>
    </>
  );
}

function ZhContent() {
  return (
    <>
      <p>
        以下是我们最常被问到的问题的快速解答。如果没有找到你想问的问题，
        <Link href="/contacto" className="font-semibold text-primary hover:underline">
          联系我们
        </Link>
        ，我们会为你提供帮助。
      </p>

      <h2>如何发布我的产品？</h2>
      <p>
        创建账户后进入
        <Link href="/submit" className="font-semibold text-primary hover:underline">
          发布
        </Link>
        页面，填写表单：名称、一句话简介、详细描述、分类、发布日期，以及（可选的）logo 和截图。你可以先保存为草稿，准备好后再发布。
      </p>

      <h2>投票是如何运作的？</h2>
      <p>
        每人对每个产品只能投一票，你可以随时取消投票。投票来自真实用户：购买投票、使用机器人或互换投票（"你投我，我投你"）都违反
        <Link href="/normas" className="font-semibold text-primary hover:underline">
          社区规范
        </Link>
        ，一经发现将导致账户被删除。
      </p>

      <h2>如何使用 Chrome 插件？</h2>
      <p>
        从
        <Link href="/extension" className="font-semibold text-primary hover:underline">
          插件
        </Link>
        页面安装插件，在该浏览器中登录 Denveler，打开你所在社区中一条公开的成就动态，点击插件图标即可。该成就会处于待审核状态，直到管理员完成核实，随后会显示在公开动态墙上。
      </p>

      <h2>"愿意接受合作"是什么意思？</h2>
      <p>
        这是创作者的一个可选标记：表示他们愿意接收关于该产品的收购请求。他们申报的指标（例如
        MRR）不会经过 Denveler 核实，后续的任何沟通或协议均在平台之外、由双方直接进行。
      </p>

      <h2>如何申请联系某位创作者？</h2>
      <p>
        如果某个产品标记为愿意接受合作，你会在其页面看到<strong>申请联系</strong>按钮。写一段简短的留言说明你的意向；创作者会决定是否与你分享邮箱。每个产品只能申请一次。
      </p>

      <h2>如何删除我的账户？</h2>
      <p>
        在你的
        <Link href="/profile" className="font-semibold text-primary hover:underline">
          个人主页
        </Link>
        底部，可以找到删除账户及全部内容的选项。该操作会立即生效，且不可撤销。
      </p>

      <h2>我发现了一个错误或不该出现的内容</h2>
      <p>
        请在产品页面使用<strong>举报</strong>按钮，或直接
        <Link href="/contacto" className="font-semibold text-primary hover:underline">
          联系我们
        </Link>
        。管理团队会审核每一条举报。
      </p>
    </>
  );
}

export default async function AyudaPage() {
  const locale = await getLocale();
  const t = await getTranslations("help");

  return (
    <ProsePage title={t("pageTitle")} updated={t("updated")}>
      {locale === "en" ? <EnContent /> : locale === "zh" ? <ZhContent /> : <EsContent />}
    </ProsePage>
  );
}
