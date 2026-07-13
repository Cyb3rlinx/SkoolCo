import type { Metadata } from "next";
import { ProsePage } from "@/components/layout/prose-page";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Qué datos recoge Denveler, para qué se usan y qué control tienes sobre ellos.",
};

export default function PrivacidadPage() {
  return (
    <ProsePage title="Política de privacidad" updated="13 de julio de 2026">
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
        La extensión “Logros” funciona bajo consentimiento explícito: solo envía el título y la URL
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
    </ProsePage>
  );
}
