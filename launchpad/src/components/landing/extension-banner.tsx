import Link from "next/link";
import { ArrowRight, CheckCircle2, Puzzle, Rocket, Trophy } from "lucide-react";

const GUARANTEES = ["Solo posts públicos", "Sin automatización", "Respeta las reglas de Skool"];

const MOCK_LOGROS = [
  { text: "¡Llegué a 100 usuarios! 🎉", meta: "Skool · hace 1 h" },
  { text: "Cerré mi primer cliente", meta: "Skool · hace 3 h" },
];

export function ExtensionBanner() {
  return (
    <section className="container-page py-16 lg:py-20">
      <div className="brand-gradient-deep relative overflow-hidden rounded-[28px] text-white shadow-lift">
        {/* Soft glow accents */}
        <div
          className="pointer-events-none absolute inset-0 [background-image:radial-gradient(420px_circle_at_85%_-10%,rgba(255,255,255,0.14),transparent_60%),radial-gradient(380px_circle_at_-5%_110%,rgba(93,224,230,0.35),transparent_60%)]"
          aria-hidden
        />

        <div className="relative grid items-center gap-10 p-8 sm:p-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider">
              <Puzzle className="h-3.5 w-3.5" aria-hidden />
              Extensión para la comunidad
            </span>

            <h2 className="max-w-lg text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              Celebra los logros de tu comunidad de Skool
            </h2>

            <p className="max-w-lg text-white/80">
              Descubre publicaciones públicas de logros, ábrelas más rápido y participa con
              apoyo real desde Denveler. Sin automatización, sin bots, sin romper reglas.
            </p>

            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {GUARANTEES.map((g) => (
                <li key={g} className="flex items-center gap-1.5 text-sm font-semibold text-white/90">
                  <CheckCircle2 className="h-4 w-4 text-white/70" aria-hidden />
                  {g}
                </li>
              ))}
            </ul>

            <Link
              href="/extension"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#001B4D] shadow-soft transition-transform duration-200 hover:-translate-y-0.5"
            >
              Conocer la extensión
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          {/* ------------------------------------------- Browser/popup mockup */}
          <div className="relative mx-auto w-full max-w-sm">
            <span
              className="brand-gradient absolute -right-3 -top-3 z-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/30 shadow-lift"
              aria-hidden
            >
              <Rocket className="h-6 w-6 text-white" />
            </span>

            <div className="rounded-[22px] border border-white/15 bg-white/95 p-1.5 shadow-lift backdrop-blur">
              {/* Browser chrome */}
              <div className="flex items-center gap-1.5 px-3 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#D9289D]/60" aria-hidden />
                <span className="h-2.5 w-2.5 rounded-full bg-[#F97316]/60" aria-hidden />
                <span className="h-2.5 w-2.5 rounded-full bg-[#0F8F8A]/60" aria-hidden />
                <span className="ml-2 text-[10px] font-semibold text-[#8A8FA3]">
                  Extensión · Logros
                </span>
              </div>

              <div className="rounded-[16px] bg-white p-4 text-foreground">
                <div className="flex items-center gap-2 border-b pb-3">
                  <span className="brand-gradient flex h-8 w-8 items-center justify-center rounded-lg" aria-hidden>
                    <Trophy className="h-4 w-4 text-white" />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold leading-none">Logros</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Apoya a tu comunidad, con tu permiso
                    </p>
                  </div>
                </div>

                <div className="space-y-2 py-3">
                  {MOCK_LOGROS.map((l) => (
                    <div key={l.text} className="rounded-xl border bg-[#F5FBFC] p-3">
                      <p className="text-xs font-bold">{l.text}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{l.meta}</p>
                    </div>
                  ))}
                </div>

                <div className="brand-gradient rounded-xl py-2.5 text-center text-xs font-bold text-white">
                  Abrir panel
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
