import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ProsePage } from "@/components/layout/prose-page";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("news");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

function EsContent() {
  return (
    <>
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
          "hoy" desde cualquier parte del mundo ya aparecen correctamente en "Lanzamientos de
          hoy".
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
          "Abierto a ofertas", declarar su MRR y recibir solicitudes de contacto de interesados.
          Sin intermediarios: el maker decide si comparte su email.
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
          <strong>Extensión de Chrome "Denveler — Logros":</strong> comparte los logros públicos
          de tu comunidad al muro de Denveler con un clic.{" "}
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
    </>
  );
}

function EnContent() {
  return (
    <>
      <p>
        Everything that's changing in Denveler, in chronological order. We build in public —
        feedback on any of this is welcome via{" "}
        <Link href="/contacto" className="font-semibold text-primary hover:underline">
          contact
        </Link>
        .
      </p>

      <h2>July 16, 2026</h2>
      <ul>
        <li>
          <strong>Timezone launch bug fixed:</strong> products published "today" from anywhere in
          the world now show up correctly under "Today's launches."
        </li>
        <li>
          <strong>About page:</strong> who we are and who operates the platform.
        </li>
        <li>
          <strong>New help pages:</strong> help center, launch guide, and this very changelog.
        </li>
      </ul>

      <h2>July 13–14, 2026</h2>
      <ul>
        <li>
          <strong>Buy/sell bridge:</strong> makers can mark their product as "Open to offers",
          declare their MRR, and receive contact requests from interested buyers. No
          intermediaries — the maker decides whether to share their email.
        </li>
        <li>
          <strong>Interest signal:</strong> makers see how many times their offer was viewed, and
          products with traction get an invitation to open up to offers.
        </li>
        <li>
          <strong>Transactional emails:</strong> password recovery, verification, and buy/sell
          bridge notifications, now on our own domain.
        </li>
      </ul>

      <h2>July 12, 2026</h2>
      <ul>
        <li>
          <strong>Denveler is Denveler:</strong> new brand, new logo, and our own domain
          (denveler.com). You may have known us as LaunchPad.
        </li>
        <li>
          <strong>Chrome extension "Denveler — Achievements":</strong> share your community's
          public achievements to the Denveler wall with one click.{" "}
          <Link href="/extension" className="font-semibold text-primary hover:underline">
            See how it works
          </Link>
          .
        </li>
        <li>
          <strong>Image gallery:</strong> every product can show up to 5 screenshots.
        </li>
      </ul>

      <h2>July 2026 — the beginning</h2>
      <ul>
        <li>
          <strong>The platform is born:</strong> publish your product, get honest votes and real
          feedback from the community. Leaderboard, comments, maker profiles, notifications, and
          human moderation from day one.
        </li>
      </ul>
    </>
  );
}

function ZhContent() {
  return (
    <>
      <p>
        以下是 Denveler 的所有更新，按时间顺序排列。我们公开构建产品——欢迎通过
        <Link href="/contacto" className="font-semibold text-primary hover:underline">
          联系我们
        </Link>
        对以上任何更新提供反馈。
      </p>

      <h2>2026 年 7 月 16 日</h2>
      <ul>
        <li>
          <strong>修复了时区相关的发布问题：</strong>无论从世界哪个时区"今天"发布的产品，现在都能正确显示在"今日发布"中。
        </li>
        <li>
          <strong>关于我们页面：</strong>介绍我们是谁、由谁运营这个平台。
        </li>
        <li>
          <strong>新增帮助页面：</strong>帮助中心、发布指南，以及你正在看的这个更新日志。
        </li>
      </ul>

      <h2>2026 年 7 月 13–14 日</h2>
      <ul>
        <li>
          <strong>买卖桥梁功能：</strong>创作者可以将自己的产品标记为"愿意接受合作"，申报 MRR，并接收感兴趣买家的联系请求。全程无中介：是否分享邮箱由创作者自行决定。
        </li>
        <li>
          <strong>关注度信号：</strong>创作者可以看到自己的合作信息被查看了多少次，有热度的产品会收到开启合作功能的邀请。
        </li>
        <li>
          <strong>事务性邮件：</strong>密码找回、账户验证以及买卖桥梁相关通知，现已使用自有域名发送。
        </li>
      </ul>

      <h2>2026 年 7 月 12 日</h2>
      <ul>
        <li>
          <strong>Denveler 正式启用新名称：</strong>全新品牌、全新 logo，以及自有域名（denveler.com）。此前你可能知道我们叫 LaunchPad。
        </li>
        <li>
          <strong>Chrome 插件"Denveler — 成就"上线：</strong>一键将社区的公开成就分享到 Denveler 动态墙。
          <Link href="/extension" className="font-semibold text-primary hover:underline">
            了解详情
          </Link>
          。
        </li>
        <li>
          <strong>图片图库：</strong>每个产品最多可展示 5 张截图。
        </li>
      </ul>

      <h2>2026 年 7 月 — 一切的开始</h2>
      <ul>
        <li>
          <strong>平台正式上线：</strong>发布你的产品，获得来自社区的真实投票和反馈。从第一天起就配备排行榜、评论、创作者主页、通知系统以及人工审核。
        </li>
      </ul>
    </>
  );
}

export default async function NovedadesPage() {
  const locale = await getLocale();
  const t = await getTranslations("news");

  return (
    <ProsePage title={t("pageTitle")} updated={t("updated")}>
      {locale === "en" ? <EnContent /> : locale === "zh" ? <ZhContent /> : <EsContent />}
    </ProsePage>
  );
}
