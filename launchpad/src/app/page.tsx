import Link from "next/link";
import {
  ArrowRight,
  Puzzle,
  MessagesSquare,
  Rocket,
  Sparkles,
  ThumbsUp,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StatPill } from "@/components/layout/stat-pill";
import { LeaderboardPreview } from "@/components/layout/leaderboard-preview";
import { ProductFeed } from "@/components/product/product-feed";
import { cn } from "@/lib/frontend/utils";

const HOW_IT_WORKS = [
  {
    icon: Rocket,
    title: "Publica tu proyecto",
    body: "Completa un formulario simple: nombre, tagline, descripción y categoría. Programa el lanzamiento o publícalo al instante.",
  },
  {
    icon: ThumbsUp,
    title: "Recibe votos y feedback",
    body: "La comunidad descubre tu producto, lo vota y deja comentarios constructivos. El apoyo real, no bots.",
  },
  {
    icon: TrendingUp,
    title: "Gana visibilidad",
    body: "Los lanzamientos con más tracción suben en el ranking y llegan a más makers. Tu esfuerzo se nota.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-[0.07] [background-image:radial-gradient(circle_at_20%_10%,hsl(258_82%_56%)_0,transparent_35%),radial-gradient(circle_at_85%_30%,hsl(243_75%_59%)_0,transparent_40%)]"
          aria-hidden
        />
        <div className="container-page grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div className="space-y-7">
            <Badge variant="outline" className="border-primary/30 bg-accent/60 py-1 text-accent-foreground">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Impulsado por la comunidad, no por algoritmos
            </Badge>

            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Lanza tu producto{" "}
              <span className="brand-text-gradient">con tu comunidad</span> detrás.
            </h1>

            <p className="max-w-xl text-lg text-muted-foreground">
              LaunchPad es el lugar donde los makers de la comunidad publican sus proyectos,
              reúnen votos, reciben feedback honesto y ganan visibilidad. Sin pay-to-win.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/submit" className={cn(buttonVariants({ variant: "gradient", size: "lg" }))}>
                <Rocket className="h-5 w-5" aria-hidden />
                Publicar mi producto
              </Link>
              <Link href="/launches" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                Explorar lanzamientos
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-4 pt-2">
              <StatPill value="9+" label="Productos lanzados" icon={<Rocket className="h-4 w-4" aria-hidden />} />
              <StatPill value="6" label="Makers activos" icon={<Users className="h-4 w-4" aria-hidden />} />
              <StatPill value="100%" label="Votos de personas reales" icon={<ThumbsUp className="h-4 w-4" aria-hidden />} />
            </div>
          </div>

          {/* Right column: live top launches + leaderboard */}
          <div className="space-y-4">
            <LeaderboardPreview />
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- Today's launches */}
      <section className="container-page py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
              <span className="brand-gradient flex h-8 w-8 items-center justify-center rounded-lg text-white">
                <TrendingUp className="h-4 w-4" aria-hidden />
              </span>
              Lanzamientos destacados
            </h2>
            <p className="mt-1 text-muted-foreground">Lo que la comunidad está apoyando ahora mismo.</p>
          </div>
          <Link
            href="/launches"
            className={cn(buttonVariants({ variant: "ghost" }), "hidden shrink-0 sm:inline-flex")}
          >
            Ver todos
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        {/* Live data via GET /api/products (sort=top), mock fallback if API down. */}
        <ProductFeed query={{ sort: "top", pageSize: 5 }} ranked limit={5} />

        <div className="mt-6 sm:hidden">
          <Link href="/launches" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
            Ver todos los lanzamientos
          </Link>
        </div>
      </section>

      {/* --------------------------------------------------------- How it works */}
      <section className="border-y bg-muted/40">
        <div className="container-page py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Cómo funciona
            </h2>
            <p className="mt-2 text-muted-foreground">
              Tres pasos. Sin trucos. El mérito lo pone la comunidad.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((step, i) => (
              <Card key={step.title} className="relative">
                <CardContent className="space-y-3 p-6">
                  <span className="brand-gradient flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-soft">
                    <step.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="text-sm font-bold text-muted-foreground">Paso {i + 1}</p>
                  <h3 className="text-lg font-extrabold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- Extension teaser */}
      <section className="container-page py-16">
        <Card className="overflow-hidden border-primary/20">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <CardContent className="space-y-5 p-8 lg:p-10">
              <Badge variant="secondary">
                <Puzzle className="h-3.5 w-3.5" aria-hidden />
                Extensión para el navegador
              </Badge>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Celebra los “Logros” de tu comunidad de Skool
              </h2>
              <p className="text-muted-foreground">
                Nuestra extensión te ayuda a descubrir los posts de logros de tu comunidad y
                apoyarlos <strong>manualmente</strong>, con un clic tuyo. Nunca vota sola, nunca
                hace scraping ni salta las reglas de Skool. Tú decides, siempre.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/extension" className={cn(buttonVariants({ variant: "default" }))}>
                  Conocer la extensión
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
              <ul className="grid gap-2 pt-2 text-sm text-muted-foreground sm:grid-cols-2">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden /> Consentimiento explícito
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden /> Cero automatización
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden /> Solo posts públicos
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden /> Respeta las reglas de Skool
                </li>
              </ul>
            </CardContent>

            <div className="relative hidden h-full min-h-[320px] items-center justify-center overflow-hidden lg:flex">
              <div className="brand-gradient absolute inset-0 opacity-90" aria-hidden />
              <div className="relative w-64 rounded-2xl border border-white/20 bg-white/95 p-4 shadow-lift">
                <div className="flex items-center gap-2 border-b pb-3">
                  <span className="brand-gradient flex h-7 w-7 items-center justify-center rounded-lg">
                    <Trophy className="h-3.5 w-3.5 text-white" aria-hidden />
                  </span>
                  <span className="text-sm font-extrabold">Logros</span>
                </div>
                <div className="space-y-2 py-3">
                  <div className="rounded-lg border bg-card p-2.5">
                    <p className="text-xs font-bold">¡Llegué a 100 usuarios! 🎉</p>
                    <p className="text-[10px] text-muted-foreground">skool.com · logro</p>
                  </div>
                  <div className="rounded-lg border bg-card p-2.5 opacity-70">
                    <p className="text-xs font-bold">Cerré mi primer cliente</p>
                    <p className="text-[10px] text-muted-foreground">skool.com · milestone</p>
                  </div>
                </div>
                <div className="rounded-lg brand-gradient py-2 text-center text-xs font-bold text-white">
                  Abrir post →
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* --------------------------------------------------------- Dual CTA */}
      <section className="container-page pb-20">
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="brand-gradient border-0 text-white">
            <CardContent className="space-y-4 p-8">
              <Rocket className="h-8 w-8" aria-hidden />
              <h3 className="text-xl font-extrabold">¿Eres creator?</h3>
              <p className="text-white/85">
                Publica tu producto y deja que la comunidad lo impulse. Feedback real, primeros
                usuarios y visibilidad desde el día uno.
              </p>
              <Link
                href="/submit"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-white text-primary hover:bg-white/90"
                )}
              >
                Publicar ahora
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-8">
              <MessagesSquare className="h-8 w-8 text-primary" aria-hidden />
              <h3 className="text-xl font-extrabold">¿Miembro de la comunidad?</h3>
              <p className="text-muted-foreground">
                Descubre productos nuevos, vota lo que te gusta y deja feedback que ayude a otros
                makers a mejorar. Tu voz cuenta.
              </p>
              <Link href="/launches" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                Explorar y votar
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
