import { sendEmail } from "./email";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Avisa al maker que alguien pidió contacto por su producto. */
export async function sendContactRequestNotification(input: {
  makerEmail: string;
  makerName: string;
  buyerName: string;
  productName: string;
  message: string;
  baseUrl: string;
}): Promise<void> {
  const subject = `Solicitud de contacto por ${input.productName} en Denveler`;
  const text = [
    `Hola ${input.makerName},`,
    ``,
    `${input.buyerName} está interesado en ${input.productName} y pidió tu contacto.`,
    `Su mensaje:`,
    `"${input.message}"`,
    ``,
    `Entra a tu perfil para compartir tu email o descartar la solicitud:`,
    `${input.baseUrl}/profile`,
  ].join("\n");
  await sendEmail({
    to: input.makerEmail,
    subject,
    text,
    html: `<p>Hola ${esc(input.makerName)},</p>
<p><strong>${esc(input.buyerName)}</strong> está interesado en <strong>${esc(input.productName)}</strong> y pidió tu contacto.</p>
<blockquote>${esc(input.message)}</blockquote>
<p><a href="${input.baseUrl}/profile">Entra a tu perfil</a> para compartir tu email o descartar la solicitud.</p>`,
  });
}

/** Avisa al comprador que el maker aceptó compartir su email. */
export async function sendContactSharedNotification(input: {
  buyerEmail: string;
  buyerName: string;
  makerName: string;
  makerEmail: string;
  productName: string;
}): Promise<void> {
  const subject = `${input.makerName} compartió su contacto por ${input.productName}`;
  const text = [
    `Hola ${input.buyerName},`,
    ``,
    `${input.makerName}, maker de ${input.productName}, aceptó compartir su contacto contigo:`,
    input.makerEmail,
    ``,
    `Escríbele directamente para continuar la conversación. Denveler no participa en la negociación.`,
  ].join("\n");
  await sendEmail({
    to: input.buyerEmail,
    subject,
    text,
    html: `<p>Hola ${esc(input.buyerName)},</p>
<p><strong>${esc(input.makerName)}</strong>, maker de <strong>${esc(input.productName)}</strong>, aceptó compartir su contacto contigo:</p>
<p><a href="mailto:${esc(input.makerEmail)}">${esc(input.makerEmail)}</a></p>
<p>Escríbele directamente para continuar la conversación. Denveler no participa en la negociación.</p>`,
  });
}
