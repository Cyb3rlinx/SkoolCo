import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/contact-form";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Escríbenos: dudas, feedback, prensa o cualquier cosa sobre Denveler.",
};

export default function ContactoPage() {
  return (
    <div className="container-page max-w-2xl py-12">
      <h1 className="text-3xl font-extrabold tracking-tight">Contacto</h1>
      <p className="mt-3 leading-relaxed text-foreground/90">
        ¿Dudas, feedback, prensa o una idea para mejorar Denveler? Escríbenos y te respondemos al
        correo que dejes. Si tu tema es sobre un producto o comentario específico, también puedes
        usar el botón <strong>Reportar</strong> en la página del producto.
      </p>
      <div className="mt-8">
        <ContactForm />
      </div>

      <div className="mt-10 border-t pt-8">
        <h2 className="text-lg font-extrabold">Contacto directo</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          ¿Prefieres escribirnos directamente? El equipo detrás de Denveler:
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          <li>
            <span className="font-semibold">William Díaz</span> —{" "}
            <a
              href="mailto:willydiaz9009@gmail.com"
              className="font-semibold text-primary hover:underline"
            >
              willydiaz9009@gmail.com
            </a>
          </li>
          <li>
            <span className="font-semibold">Kevin</span> —{" "}
            <a
              href="mailto:keev.seven@hotmail.com"
              className="font-semibold text-primary hover:underline"
            >
              keev.seven@hotmail.com
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
