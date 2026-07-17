import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ProsePage } from "@/components/layout/prose-page";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("guides");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

function EsContent() {
  return (
    <>
      <p>
        Publicar toma 5 minutos. Publicar <em>bien</em> toma 30 — y la diferencia se nota en los
        votos, el feedback y las oportunidades que llegan después. Esta es la checklist que
        usamos nosotros mismos.
      </p>

      <h2>Antes de publicar</h2>
      <ul>
        <li>
          <strong>Un tagline que se entienda en 3 segundos.</strong> Di qué hace y para quién:
          "Facturas automáticas para freelancers" gana contra "La revolución de la productividad".
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
          "Lanzamientos de hoy" — más horas visible, más votos.
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
          venderlo (o recibir propuestas), activa "Abierto a ofertas" desde la página de tu
          producto y declara tu MRR. Los interesados podrán pedirte el contacto.
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
    </>
  );
}

function EnContent() {
  return (
    <>
      <p>
        Publishing takes 5 minutes. Publishing <em>well</em> takes 30 — and the difference shows in
        the votes, the feedback, and the opportunities that come afterward. This is the checklist
        we use ourselves.
      </p>

      <h2>Before you publish</h2>
      <ul>
        <li>
          <strong>A tagline that clicks in 3 seconds.</strong> Say what it does and who it's for:
          "Automatic invoicing for freelancers" beats "The productivity revolution."
        </li>
        <li>
          <strong>An honest description:</strong> what problem it solves, who it's for, what makes
          it different, and what feedback you're looking for from the community. That last part
          multiplies useful comments.
        </li>
        <li>
          <strong>A real logo and screenshots.</strong> A product with no screenshots gets fewer
          clicks. You can upload up to 5 images in the gallery.
        </li>
        <li>
          <strong>A working site.</strong> Before you publish, test your link in an incognito
          window — people WILL click.
        </li>
      </ul>

      <h2>Launch day</h2>
      <ul>
        <li>
          <strong>Publish early in your timezone.</strong> Your product competes in "Today's
          launches" — more hours visible, more votes.
        </li>
        <li>
          <strong>Share your product's direct link</strong> in your community, your socials, and
          your groups. Ask for feedback, not votes — feedback brings votes on its own.
        </li>
        <li>
          <strong>Reply to every comment.</strong> Makers who engage get more votes and more repeat
          visits. And the community notices.
        </li>
      </ul>

      <h2>After launch</h2>
      <ul>
        <li>
          <strong>Share your achievements with the extension.</strong> Did your launch post take
          off in your community? Send it to the achievements wall with the{" "}
          <Link href="/extension" className="font-semibold text-primary hover:underline">
            Chrome extension
          </Link>
          .
        </li>
        <li>
          <strong>Consider opening to offers.</strong> If your product already has revenue and
          you're interested in selling it (or hearing proposals), enable "Open to offers" from
          your product page and declare your MRR. Interested people will be able to request your
          contact info.
        </li>
        <li>
          <strong>Iterate on the feedback.</strong> Come back to the comments in a week — that's
          your free roadmap.
        </li>
      </ul>

      <p>
        Ready?{" "}
        <Link href="/submit" className="font-semibold text-primary hover:underline">
          Publish your product
        </Link>
        .
      </p>
    </>
  );
}

function ZhContent() {
  return (
    <>
      <p>发布只需要 5 分钟，但要发布<em>好</em>需要 30 分钟——而这个差异会直接体现在投票数、反馈质量，以及后续带来的机会上。以下是我们自己也在用的检查清单。</p>

      <h2>发布之前</h2>
      <ul>
        <li>
          <strong>一句 3 秒内就能看懂的标语。</strong>说清楚它是做什么的、给谁用的："为自由职业者提供自动开票服务"要比"效率革命的开创者"更打动人。
        </li>
        <li>
          <strong>如实的描述：</strong>它解决了什么问题、面向谁、有什么不同之处，以及你希望从社区获得哪方面的反馈。最后这一点能大幅提升有价值评论的数量。
        </li>
        <li>
          <strong>真实的 logo 和截图。</strong>没有截图的产品点击量会更低。你最多可以在图库中上传 5 张图片。
        </li>
        <li>
          <strong>确保网站能正常访问。</strong>发布前请在无痕窗口中测试一下你的链接——大家真的会点击。
        </li>
      </ul>

      <h2>发布当天</h2>
      <ul>
        <li>
          <strong>在你所在时区尽早发布。</strong>你的产品会出现在"今日发布"中——展示时间越长，获得的投票就越多。
        </li>
        <li>
          <strong>分享你产品的直达链接</strong>到你的社区、社交媒体和各个群组。请求反馈，而不是索要投票：好的反馈自然会带来投票。
        </li>
        <li>
          <strong>回复每一条评论。</strong>愿意互动的创作者会获得更多投票和回访。社区也会注意到这一点。
        </li>
      </ul>

      <h2>发布之后</h2>
      <ul>
        <li>
          <strong>用浏览器插件分享你的成就。</strong>你的发布动态在社区里反响热烈吗？用
          <Link href="/extension" className="font-semibold text-primary hover:underline">
            Chrome 插件
          </Link>
          把它发送到成就墙吧。
        </li>
        <li>
          <strong>考虑开放合作。</strong>如果你的产品已经有收入，并且你有意出售（或听取相关提议），可以在产品页面开启"愿意接受合作"并申报你的 MRR。感兴趣的人将可以申请与你联系。
        </li>
        <li>
          <strong>根据反馈持续迭代。</strong>一周后回来看看评论区——那里就是你的免费路线图。
        </li>
      </ul>

      <p>
        准备好了吗？
        <Link href="/submit" className="font-semibold text-primary hover:underline">
          发布你的产品
        </Link>
        。
      </p>
    </>
  );
}

export default async function GuiasPage() {
  const locale = await getLocale();
  const t = await getTranslations("guides");

  return (
    <ProsePage title={t("pageTitle")} updated={t("updated")}>
      {locale === "en" ? <EnContent /> : locale === "zh" ? <ZhContent /> : <EsContent />}
    </ProsePage>
  );
}
