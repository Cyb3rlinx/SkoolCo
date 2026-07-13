import Link from "next/link";
import { ArrowRight, Star, Users2 } from "lucide-react";

const CTAS = [
  {
    icon: Star,
    title: "¿Eres creador?",
    body: "Publica tu proyecto, gana con la comunidad y recibe feedback que te ayudará a construir la mejor versión.",
    link: { label: "Publicar ahora", href: "/submit" },
  },
  {
    icon: Users2,
    title: "¿Miembro de la comunidad?",
    body: "Descubre proyectos increíbles, vota los que te gustan y ayúdalos a crecer desde el inicio.",
    link: { label: "Explorar y votar", href: "/launches" },
  },
];

export function CTASection() {
  return (
    <section className="container-page pb-20">
      <div className="grid gap-6 md:grid-cols-2">
        {CTAS.map((cta) => (
          <div
            key={cta.title}
            className="group rounded-[24px] border bg-[#EDFBFC] p-8 shadow-soft transition-shadow duration-300 hover:shadow-lift"
          >
            <span
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/15 bg-white text-primary shadow-soft"
              aria-hidden
            >
              <cta.icon className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <h3 className="mt-5 text-xl font-extrabold tracking-tight">{cta.title}</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">{cta.body}</p>
            <Link
              href={cta.link.href}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-primary group-hover:underline"
            >
              {cta.link.label}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
