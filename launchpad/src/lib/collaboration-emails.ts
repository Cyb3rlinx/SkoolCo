import { sendEmail } from "./email";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Avisa al autor del anuncio que alguien pidió contacto. */
export async function sendCollaborationContactRequestNotification(input: {
  authorEmail: string;
  authorName: string;
  responderName: string;
  collaborationTitle: string;
  message: string;
  baseUrl: string;
}): Promise<void> {
  const subject = `Solicitud de contacto por "${input.collaborationTitle}" en Denveler`;
  const text = [
    `Hola ${input.authorName},`,
    ``,
    `${input.responderName} vio tu anuncio "${input.collaborationTitle}" y pidió tu contacto.`,
    `Su mensaje:`,
    `"${input.message}"`,
    ``,
    `Entra a tu perfil para compartir tu email o descartar la solicitud:`,
    `${input.baseUrl}/profile`,
  ].join("\n");
  await sendEmail({
    to: input.authorEmail,
    subject,
    text,
    html: `<p>Hola ${esc(input.authorName)},</p>
<p><strong>${esc(input.responderName)}</strong> vio tu anuncio <strong>${esc(input.collaborationTitle)}</strong> y pidió tu contacto.</p>
<blockquote>${esc(input.message)}</blockquote>
<p><a href="${input.baseUrl}/profile">Entra a tu perfil</a> para compartir tu email o descartar la solicitud.</p>`,
  });
}

/** Avisa a quien respondió que el autor aceptó compartir su email. */
export async function sendCollaborationContactSharedNotification(input: {
  responderEmail: string;
  responderName: string;
  authorName: string;
  authorEmail: string;
  collaborationTitle: string;
}): Promise<void> {
  const subject = `${input.authorName} compartió su contacto por "${input.collaborationTitle}"`;
  const text = [
    `Hola ${input.responderName},`,
    ``,
    `${input.authorName}, autor de "${input.collaborationTitle}", aceptó compartir su contacto contigo:`,
    input.authorEmail,
    ``,
    `Escríbele directamente para continuar la conversación. Denveler no participa en la negociación.`,
  ].join("\n");
  await sendEmail({
    to: input.responderEmail,
    subject,
    text,
    html: `<p>Hola ${esc(input.responderName)},</p>
<p><strong>${esc(input.authorName)}</strong>, autor de <strong>${esc(input.collaborationTitle)}</strong>, aceptó compartir su contacto contigo:</p>
<p><a href="mailto:${esc(input.authorEmail)}">${esc(input.authorEmail)}</a></p>
<p>Escríbele directamente para continuar la conversación. Denveler no participa en la negociación.</p>`,
  });
}
