import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ProsePage } from "@/components/layout/prose-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.privacy");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

function EsContent() {
  return (
    <>
      <p>
        Denveler es una plataforma comunitaria para lanzar productos. Esta política explica, sin
        letra pequeña, qué datos recogemos, para qué los usamos y qué control tienes sobre ellos.
      </p>

      <h2>Qué datos recogemos</h2>
      <ul>
        <li>
          <strong>Datos de cuenta:</strong> nombre, email y contraseña (guardada solo como hash
          seguro — nunca podemos ver tu contraseña).
        </li>
        <li>
          <strong>Contenido que publicas:</strong> productos, comentarios, votos, enlaces de logros
          e imágenes que subes (logos, avatares).
        </li>
        <li>
          <strong>Datos técnicos mínimos:</strong> cookies de sesión para mantenerte dentro, y
          dirección IP usada únicamente para límites anti-abuso (rate limiting).
        </li>
      </ul>

      <h2>Para qué los usamos</h2>
      <ul>
        <li>Operar la plataforma: tu perfil, tus lanzamientos, votos y notificaciones.</li>
        <li>Emails transaccionales: verificación de cuenta y restablecimiento de contraseña.</li>
        <li>Moderación: revisar contenido reportado y mantener la comunidad sana.</li>
      </ul>

      <h2>Lo que NO hacemos</h2>
      <ul>
        <li>No vendemos ni alquilamos tus datos a nadie.</li>
        <li>No usamos publicidad de terceros ni rastreadores de marketing.</li>
        <li>No leemos ni tocamos tus cuentas de otras plataformas (Skool, Discord, etc.).</li>
      </ul>

      <h2>La extensión del navegador</h2>
      <p>
        La extensión "Logros" funciona bajo consentimiento explícito: solo envía el título y la URL
        pública de un post cuando tú haces clic en enviar. No captura nada en segundo plano, no
        almacena credenciales de otras plataformas y no automatiza ninguna acción.
      </p>

      <h2>Tus derechos</h2>
      <ul>
        <li>
          <strong>Eliminar tu cuenta:</strong> desde tu perfil, en cualquier momento. Borra tus
          productos, votos y comentarios de forma permanente.
        </li>
        <li>
          <strong>Editar tus datos:</strong> nombre, bio y avatar se cambian desde tu perfil.
        </li>
        <li>
          <strong>Preguntar:</strong> escríbenos y te respondemos qué datos tenemos sobre ti.
        </li>
      </ul>

      <h2>Dónde viven los datos</h2>
      <p>
        La base de datos se aloja en proveedores gestionados con cifrado en tránsito y en reposo.
        Los datos se conservan mientras tu cuenta exista; al eliminarla, se borran con ella.
      </p>

      <h2>Cambios a esta política</h2>
      <p>
        Si cambiamos algo relevante, actualizaremos la fecha de arriba y lo anunciaremos en la
        plataforma antes de que entre en vigor.
      </p>
    </>
  );
}

function EnContent() {
  return (
    <>
      <p>
        Denveler is a community platform for launching products. This policy explains, in plain
        language, what data we collect, what we use it for, and what control you have over it.
      </p>

      <h2>What data we collect</h2>
      <ul>
        <li>
          <strong>Account data:</strong> name, email, and password (stored only as a secure hash —
          we can never see your password).
        </li>
        <li>
          <strong>Content you post:</strong> products, comments, votes, achievement links, and
          images you upload (logos, avatars).
        </li>
        <li>
          <strong>Minimal technical data:</strong> session cookies to keep you signed in, and an IP
          address used only for anti-abuse limits (rate limiting).
        </li>
      </ul>

      <h2>What we use it for</h2>
      <ul>
        <li>Operating the platform: your profile, launches, votes, and notifications.</li>
        <li>Transactional emails: account verification and password reset.</li>
        <li>Moderation: reviewing reported content and keeping the community healthy.</li>
      </ul>

      <h2>What we DON'T do</h2>
      <ul>
        <li>We don't sell or rent your data to anyone.</li>
        <li>We don't use third-party advertising or marketing trackers.</li>
        <li>We don't read or touch your accounts on other platforms (Skool, Discord, etc.).</li>
      </ul>

      <h2>The browser extension</h2>
      <p>
        The "Achievements" extension works on explicit consent: it only sends a post's title and
        public URL when you click submit. It doesn't capture anything in the background, doesn't
        store credentials for other platforms, and doesn't automate any action.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li>
          <strong>Delete your account:</strong> from your profile, at any time. This permanently
          erases your products, votes, and comments.
        </li>
        <li>
          <strong>Edit your data:</strong> name, bio, and avatar can be changed from your profile.
        </li>
        <li>
          <strong>Ask us:</strong> write to us and we'll tell you what data we hold about you.
        </li>
      </ul>

      <h2>Where the data lives</h2>
      <p>
        The database is hosted with managed providers using encryption in transit and at rest. Data
        is kept as long as your account exists; deleting it erases the data with it.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If we change anything material, we'll update the date above and announce it on the platform
        before it takes effect.
      </p>
    </>
  );
}

function ZhContent() {
  return (
    <>
      <p>Denveler 是一个用于发布产品的社区平台。本政策会直白地说明我们收集哪些数据、用于什么目的，以及你对这些数据拥有怎样的控制权。</p>

      <h2>我们收集哪些数据</h2>
      <ul>
        <li>
          <strong>账户数据：</strong>姓名、邮箱和密码（仅以安全哈希形式保存——我们永远无法看到你的原始密码）。
        </li>
        <li>
          <strong>你发布的内容：</strong>产品、评论、投票、成就链接，以及你上传的图片（logo、头像）。
        </li>
        <li>
          <strong>最少量的技术数据：</strong>用于保持登录状态的会话 Cookie，以及仅用于防滥用限流的 IP 地址。
        </li>
      </ul>

      <h2>我们用这些数据做什么</h2>
      <ul>
        <li>运营平台：你的主页、发布内容、投票和通知。</li>
        <li>事务性邮件：账户验证和密码重置。</li>
        <li>内容审核：处理被举报的内容，维护健康的社区环境。</li>
      </ul>

      <h2>我们不会做的事</h2>
      <ul>
        <li>不会向任何人出售或出租你的数据。</li>
        <li>不使用第三方广告或营销追踪器。</li>
        <li>不会读取或触碰你在其他平台（Skool、Discord 等）的账户。</li>
      </ul>

      <h2>浏览器插件</h2>
      <p>
        "成就"插件在明确授权下运行：只有当你点击发送时，它才会发送一条动态的标题和公开链接。它不会在后台采集任何信息，不存储其他平台的登录凭证，也不会自动执行任何操作。
      </p>

      <h2>你的权利</h2>
      <ul>
        <li>
          <strong>删除账户：</strong>可随时在个人主页操作，永久删除你的产品、投票和评论。
        </li>
        <li>
          <strong>编辑资料：</strong>姓名、简介和头像均可在个人主页修改。
        </li>
        <li>
          <strong>咨询：</strong>联系我们，我们会告知你我们持有关于你的哪些数据。
        </li>
      </ul>

      <h2>数据存储在哪里</h2>
      <p>数据库托管在采用传输和静态加密的托管服务商上。数据会在账户存续期间保留；账户删除后，相关数据也会一并删除。</p>

      <h2>本政策的变更</h2>
      <p>如果我们对政策做出重大变更，会更新上方日期，并在生效前在平台上公告。</p>
    </>
  );
}

export default async function PrivacidadPage() {
  const locale = await getLocale();
  const t = await getTranslations("legal.privacy");

  return (
    <ProsePage title={t("pageTitle")} updated={t("updated")}>
      {locale === "en" ? <EnContent /> : locale === "zh" ? <ZhContent /> : <EsContent />}
    </ProsePage>
  );
}
