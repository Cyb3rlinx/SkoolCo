import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ProsePage } from "@/components/layout/prose-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.rules");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

function EsContent() {
  return (
    <>
      <p>
        Denveler funciona porque los votos y el feedback son reales. Estas normas protegen eso.
        Son pocas y van en serio.
      </p>

      <h2>1. Votos honestos, siempre</h2>
      <ul>
        <li>Vota lo que de verdad te parece bueno. Nada de bots ni cuentas alternativas.</li>
        <li>Prohibido comprar, vender o intercambiar votos ("vota y te voto").</li>
        <li>Pedir apoyo a tu comunidad está bien; obligar o pagar por él, no.</li>
      </ul>

      <h2>2. Feedback que ayuda</h2>
      <ul>
        <li>Critica el producto, no a la persona. Di qué mejorarías y por qué.</li>
        <li>Sin insultos, acoso, spam ni autopromoción fuera de lugar en los comentarios.</li>
      </ul>

      <h2>3. Lanzamientos legítimos</h2>
      <ul>
        <li>Publica productos tuyos o en los que participas de verdad.</li>
        <li>Describe con honestidad: sin promesas falsas ni copias de otros.</li>
        <li>Nada ilegal, malicioso (malware, estafas) ni contenido para adultos.</li>
      </ul>

      <h2>4. Logros de la comunidad</h2>
      <ul>
        <li>Comparte solo posts públicos y reales. Un moderador los verifica antes de publicarse.</li>
        <li>Respeta las reglas de la plataforma de origen (Skool, Discord, etc.).</li>
      </ul>

      <h2>Si algo se rompe</h2>
      <p>
        Usa el botón <strong>Reportar</strong> en cualquier producto o comentario. Un moderador lo
        revisa y queda registro de quién resolvió qué. Las infracciones leves se avisan; las graves
        o repetidas terminan en suspensión de la cuenta.
      </p>
    </>
  );
}

function EnContent() {
  return (
    <>
      <p>
        Denveler works because votes and feedback are real. These guidelines protect that. They're
        short, and we mean them.
      </p>

      <h2>1. Honest votes, always</h2>
      <ul>
        <li>Vote for what you genuinely think is good. No bots, no alt accounts.</li>
        <li>Buying, selling, or trading votes ("vote for vote") is forbidden.</li>
        <li>Asking your community for support is fine; forcing or paying for it isn't.</li>
      </ul>

      <h2>2. Feedback that helps</h2>
      <ul>
        <li>Critique the product, not the person. Say what you'd improve and why.</li>
        <li>No insults, harassment, spam, or off-topic self-promotion in comments.</li>
      </ul>

      <h2>3. Legitimate launches</h2>
      <ul>
        <li>Only publish products you own or genuinely work on.</li>
        <li>Describe them honestly: no false promises, no copying others.</li>
        <li>Nothing illegal or malicious (malware, scams) and no adult content.</li>
      </ul>

      <h2>4. Community achievements</h2>
      <ul>
        <li>Only share real, public posts. A moderator verifies them before they go live.</li>
        <li>Respect the rules of the source platform (Skool, Discord, etc.).</li>
      </ul>

      <h2>If something's wrong</h2>
      <p>
        Use the <strong>Report</strong> button on any product or comment. A moderator reviews it and
        we keep a record of who resolved what. Minor infractions get a warning; serious or repeated
        ones end in account suspension.
      </p>
    </>
  );
}

function ZhContent() {
  return (
    <>
      <p>Denveler 之所以有效，是因为投票和反馈都是真实的。这些规范正是为了保护这一点，条款不多，但都是认真的。</p>

      <h2>1. 始终真实投票</h2>
      <ul>
        <li>只为你真心认为好的产品投票。禁止使用机器人或小号。</li>
        <li>严禁买卖或互换投票（"你投我，我投你"）。</li>
        <li>请求社区支持是可以的；强迫或付费换取投票则不行。</li>
      </ul>

      <h2>2. 有价值的反馈</h2>
      <ul>
        <li>评论产品本身，而不是攻击发布者。说明你会如何改进以及原因。</li>
        <li>评论区禁止侮辱、骚扰、垃圾信息或不相关的自我推销。</li>
      </ul>

      <h2>3. 合法的发布</h2>
      <ul>
        <li>只能发布你拥有或真正参与的产品。</li>
        <li>如实描述：不做虚假承诺，不抄袭他人。</li>
        <li>禁止任何非法或恶意内容（恶意软件、诈骗），禁止成人内容。</li>
      </ul>

      <h2>4. 社区成就</h2>
      <ul>
        <li>只分享真实的公开动态。发布前会由管理员审核。</li>
        <li>遵守来源平台（Skool、Discord 等）的规则。</li>
      </ul>

      <h2>如果出现问题</h2>
      <p>
        对任何产品或评论使用<strong>举报</strong>按钮。管理员会进行审核，并记录处理情况。轻微违规会收到警告；严重或屡次违规将导致账户被暂停。
      </p>
    </>
  );
}

export default async function NormasPage() {
  const locale = await getLocale();
  const t = await getTranslations("legal.rules");

  return (
    <ProsePage title={t("pageTitle")} updated={t("updated")}>
      {locale === "en" ? <EnContent /> : locale === "zh" ? <ZhContent /> : <EsContent />}
    </ProsePage>
  );
}
