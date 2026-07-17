import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ProsePage } from "@/components/layout/prose-page";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.terms");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

function EsContent() {
  return (
    <>
      <p>
        Al crear una cuenta en Denveler aceptas estos términos. Son cortos a propósito: queremos
        que los leas de verdad.
      </p>

      <h2>El servicio</h2>
      <p>
        Denveler permite publicar productos, recibir votos y comentarios de la comunidad y ganar
        visibilidad. Es un servicio en evolución (MVP): puede cambiar, tener errores o
        interrumpirse; lo ofrecemos "tal cual", sin garantías de disponibilidad.
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
        cuentas múltiples o intercambios de votos ("vota y te voto") está prohibido y es causa de
        eliminación de cuenta.
      </p>

      <h2>La extensión</h2>
      <p>
        La extensión "Logros" es opcional y funciona solo con tu clic. Eres responsable de usarla
        respetando las reglas de las plataformas donde participas.
      </p>

      <h2>Métricas declaradas y contacto entre usuarios</h2>
      <p>
        Un maker puede declarar métricas de su producto (como MRR) y marcarse "abierto a ofertas".
        Esas métricas las declara el maker bajo su exclusiva responsabilidad: Denveler{" "}
        <strong>no las verifica</strong> ni garantiza su exactitud. Las solicitudes de contacto solo
        intercambian mensajes y, si el maker acepta, su email. Cualquier conversación, acuerdo o
        transacción posterior ocurre fuera de la plataforma y es responsabilidad exclusiva de las
        partes; Denveler no participa, no intermedia ni cobra por ello.
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
    </>
  );
}

function EnContent() {
  return (
    <>
      <p>
        By creating a Denveler account you agree to these terms. They're short on purpose — we want
        you to actually read them.
      </p>

      <h2>The service</h2>
      <p>
        Denveler lets you publish products, receive votes and comments from the community, and gain
        visibility. It's an evolving service (MVP): it may change, have bugs, or go down; we offer
        it "as is", with no availability guarantees.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You're responsible for what happens under your account and for keeping your password secure.</li>
        <li>One person, one account. Accounts used to inflate votes get removed.</li>
        <li>You can delete your account whenever you want from your profile.</li>
      </ul>

      <h2>Your content</h2>
      <ul>
        <li>
          What you publish (products, comments, images) remains yours. You grant us permission to
          display it on the platform, which is what you published it for.
        </li>
        <li>Only publish what you have the right to publish (no logos or images that aren't yours).</li>
        <li>
          We may remove content that violates the{" "}
          <Link href="/normas" className="font-semibold text-primary hover:underline">
            community guidelines
          </Link>{" "}
          or the law, and suspend accounts that repeat offenses.
        </li>
      </ul>

      <h2>Votes and reputation</h2>
      <p>
        Denveler's value comes from votes being from real people. Buying votes, using bots, multiple
        accounts, or vote trading ("vote for vote") is forbidden and grounds for account removal.
      </p>

      <h2>The extension</h2>
      <p>
        The "Achievements" extension is optional and only acts on your click. You're responsible for
        using it in line with the rules of the platforms you participate in.
      </p>

      <h2>Declared metrics and contact between users</h2>
      <p>
        A maker may declare metrics for their product (like MRR) and mark themselves "open to
        offers". Those metrics are declared by the maker under their sole responsibility: Denveler{" "}
        <strong>does not verify them</strong> or guarantee their accuracy. Contact requests only
        exchange messages and, if the maker accepts, their email. Any subsequent conversation,
        agreement, or transaction happens off-platform and is the sole responsibility of the
        parties involved; Denveler does not participate, intermediate, or charge for it.
      </p>

      <h2>Liability</h2>
      <p>
        Published products belong to their makers; Denveler doesn't guarantee their quality or take
        responsibility for agreements between users. To the extent the law allows, our liability is
        limited to the free use of the service.
      </p>

      <h2>Changes</h2>
      <p>
        If we make material changes to these terms, we'll update the date and announce it on the
        platform. Continuing to use Denveler afterward means accepting the new version.
      </p>
    </>
  );
}

function ZhContent() {
  return (
    <>
      <p>创建 Denveler 账户即表示你同意这些条款。条款特意写得简短——因为我们希望你真的会读完。</p>

      <h2>服务内容</h2>
      <p>
        Denveler 让你能够发布产品，获得来自社区的投票和评论，并赢得关注度。这是一个不断迭代的服务（MVP）：它可能会变化、出现问题或中断；我们按"现状"提供服务，不对可用性作出保证。
      </p>

      <h2>你的账户</h2>
      <ul>
        <li>你需对账户下发生的一切行为负责，并妥善保管你的密码。</li>
        <li>一人一号。用于刷票的账户将被删除。</li>
        <li>你可以随时在个人主页删除账户。</li>
      </ul>

      <h2>你的内容</h2>
      <ul>
        <li>你发布的内容（产品、评论、图片）版权仍归你所有。你授权我们在平台上展示这些内容——这也是你发布它们的目的。</li>
        <li>只能发布你有权发布的内容（不得使用他人的 logo 或图片）。</li>
        <li>
          若内容违反
          <Link href="/normas" className="font-semibold text-primary hover:underline">
            社区规范
          </Link>
          或法律规定，我们有权移除，并对屡次违规的账户予以暂停。
        </li>
      </ul>

      <h2>投票与信誉</h2>
      <p>
        Denveler 的价值在于投票来自真实用户。购买投票、使用机器人、使用多个账户或互换投票（"你投我，我投你"）均被禁止，一经发现将导致账户被删除。
      </p>

      <h2>浏览器插件</h2>
      <p>"成就"插件是可选功能，仅在你点击时才会生效。你需负责按照所参与平台的规则来使用它。</p>

      <h2>申报的指标与用户间联系</h2>
      <p>
        创作者可以为其产品申报指标（例如 MRR），并将自己标记为"愿意接受合作"。这些指标由创作者自行申报并自负其责：Denveler
        <strong>不对其进行核实</strong>，也不保证其准确性。联系请求仅用于交换消息，若创作者同意，也可交换邮箱。后续的任何沟通、协议或交易均在平台之外进行，责任完全由相关各方自行承担；Denveler
        不参与、不作中介，也不从中收费。
      </p>

      <h2>责任限制</h2>
      <p>
        已发布的产品归其创作者所有；Denveler 不对其质量作出保证，也不对用户之间的约定承担责任。在法律允许的范围内，我们的责任仅限于本服务的免费使用部分。
      </p>

      <h2>条款变更</h2>
      <p>如果我们对这些条款做出重大变更，会更新上方日期并在平台上公告。此后继续使用 Denveler 即表示你接受新版本条款。</p>
    </>
  );
}

export default async function TerminosPage() {
  const locale = await getLocale();
  const t = await getTranslations("legal.terms");

  return (
    <ProsePage title={t("pageTitle")} updated={t("updated")}>
      {locale === "en" ? <EnContent /> : locale === "zh" ? <ZhContent /> : <EsContent />}
    </ProsePage>
  );
}
