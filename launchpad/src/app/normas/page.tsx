import type { Metadata } from "next";
import { ProsePage } from "@/components/layout/prose-page";

export const metadata: Metadata = {
  title: "Normas de la comunidad",
  description: "Las reglas que mantienen a LaunchPad útil, honesto y humano.",
};

export default function NormasPage() {
  return (
    <ProsePage title="Normas de la comunidad" updated="12 de julio de 2026">
      <p>
        LaunchPad funciona porque los votos y el feedback son reales. Estas normas protegen eso.
        Son pocas y van en serio.
      </p>

      <h2>1. Votos honestos, siempre</h2>
      <ul>
        <li>Vota lo que de verdad te parece bueno. Nada de bots ni cuentas alternativas.</li>
        <li>Prohibido comprar, vender o intercambiar votos (“vota y te voto”).</li>
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
    </ProsePage>
  );
}
