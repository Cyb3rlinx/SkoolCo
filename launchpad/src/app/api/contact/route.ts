export const dynamic = "force-dynamic";

import { sendEmail } from "@/lib/email";
import { contactMessageSchema } from "@/lib/validation";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { withErrorHandling, parseBody, ok, errorResponse, clientIp } from "@/lib/api";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * POST /api/contact — formulario público de contacto del footer.
 * No requiere sesión (cualquiera puede escribir). El mensaje llega por email
 * al buzón del equipo (CONTACT_EMAIL; por defecto el email del publisher,
 * que ya es público en la ficha de la Chrome Web Store).
 */
export const POST = withErrorHandling(async (req: Request) => {
  if (!(await checkRateLimit(`contact:${clientIp(req)}`, RATE_LIMITS.contactForm))) {
    return errorResponse(429, "Demasiados mensajes. Intenta más tarde.");
  }

  const input = await parseBody(req, contactMessageSchema);
  const to = process.env.CONTACT_EMAIL ?? "willydiaz9009@gmail.com";

  // El email no debe revelar si falló el proveedor: respuesta genérica igual.
  try {
    await sendEmail({
      to,
      subject: `Contacto Denveler: mensaje de ${input.name}`,
      text: [
        `Nombre: ${input.name}`,
        `Email: ${input.email}`,
        ``,
        input.message,
      ].join("\n"),
      html: `<p><strong>Nombre:</strong> ${esc(input.name)}<br/>
<strong>Email:</strong> ${esc(input.email)}</p>
<blockquote>${esc(input.message).replace(/\n/g, "<br/>")}</blockquote>`,
    });
  } catch (err) {
    console.error("[contact] envío falló:", err);
    return errorResponse(500, "No pudimos enviar tu mensaje. Intenta de nuevo en unos minutos.");
  }

  return ok({ message: "Mensaje enviado. Te responderemos pronto." });
});
