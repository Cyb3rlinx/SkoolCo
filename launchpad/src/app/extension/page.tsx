import type { Metadata } from "next";
import {
  Ban,
  Puzzle,
  Hand,
  Lock,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ExtensionPopupMock } from "@/components/extension/extension-popup-mock";
import { LogrosWall } from "@/components/extension/logros-wall";

export const metadata: Metadata = {
  title: "Extensión Logros",
  description:
    "Descubre y apoya manualmente los logros de tu comunidad de Skool. Diseñada con consentimiento explícito: nunca vota sola, nunca hace scraping.",
};

const STEPS = [
  {
    icon: MousePointerClick,
    title: "Abre un post de logro",
    body: "Navega a un post público de tu comunidad en Skool, como siempre.",
  },
  {
    icon: Hand,
    title: "Tú decides enviarlo",
    body: "Haces clic en la extensión y pulsas “Enviar”. El título viene pre-cargado y editable.",
  },
  {
    icon: Trophy,
    title: "Se verifica y se celebra",
    body: "Un moderador confirma que es real y aparece en el muro de Logros de la comunidad.",
  },
];

const NEVER = [
  "Votar automáticamente o en masa",
  "Hacer scraping de datos privados",
  "Guardar tus credenciales de Skool",
  "Actuar sin un clic explícito tuyo",
  "Saltarse las reglas de Skool",
];

const ALWAYS = [
  "Pedir tu acción manual para todo",
  "Trabajar solo con posts públicos",
  "Usar tu propia sesión del sitio",
  "Mostrar el estado de cada envío",
  "Respetar los términos de Skool",
];

export default function ExtensionPage() {
  return (
    <div className="space-y-20 pb-20">
      {/* Hero */}
      <section className="border-b bg-muted/30">
        <div className="container-page grid items-center gap-12 py-16 lg:grid-cols-[1fr_auto]">
          <div className="space-y-6">
            <Badge variant="secondary">
              <Puzzle className="h-3.5 w-3.5" aria-hidden />
              Concepto de extensión · Chrome / navegadores
            </Badge>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Celebra los <span className="brand-text-gradient">Logros</span> de tu comunidad
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              La extensión Logros te ayuda a descubrir los posts de logros de tu comunidad de
              Skool y apoyarlos de forma <strong>manual y consentida</strong>. Es una herramienta
              para dar visibilidad a la gente que construye — no un bot.
            </p>
            <Alert variant="success">
              <strong>Diseño consent-first:</strong> cada acción necesita un clic tuyo. La
              extensión nunca vota, nunca automatiza y nunca toca datos privados.
            </Alert>
          </div>

          <div className="justify-self-center lg:justify-self-end">
            <ExtensionPopupMock />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Cómo funciona</h2>
          <p className="mt-2 text-muted-foreground">
            Tú tienes el control en cada paso. Literalmente.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Card key={step.title}>
              <CardContent className="space-y-3 p-6">
                <div className="flex items-center gap-3">
                  <span className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white">
                    <step.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-sm font-bold text-muted-foreground">Paso {i + 1}</span>
                </div>
                <h3 className="text-lg font-extrabold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Safety model: Never / Always */}
      <section className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="border-primary/30">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Nuestro compromiso
          </Badge>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Lo que la extensión nunca hará
          </h2>
          <p className="mt-2 text-muted-foreground">
            Estas restricciones son deliberadas y están en el diseño, no en la letra pequeña.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
          <Card className="border-destructive/25">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-2 font-extrabold text-destructive">
                <Ban className="h-5 w-5" aria-hidden />
                Nunca
              </div>
              <ul className="space-y-2.5">
                {NEVER.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <Ban className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-success/25">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-2 font-extrabold text-success">
                <ShieldCheck className="h-5 w-5" aria-hidden />
                Siempre
              </div>
              <ul className="space-y-2.5">
                {ALWAYS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="mx-auto mt-6 flex max-w-4xl items-start gap-3 rounded-2xl border border-dashed bg-muted/40 p-5">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Privacidad por diseño.</strong> La extensión usa
            tu misma sesión de LaunchPad (sin tokens aparte) y solo envía el título y la URL
            pública que tú eliges compartir. No lee mensajes privados, no guarda cookies de Skool
            y no envía nada sin tu clic.
          </p>
        </div>
      </section>

      {/* Logros wall */}
      <section className="container-page">
        <div className="mb-8 flex flex-col items-center text-center">
          <Badge variant="gradient">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Muro de la comunidad
          </Badge>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Logros verificados
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Los logros que la comunidad envió y un moderador verificó. Haz clic para apoyarlos en
            el post original.
          </p>
        </div>
        <LogrosWall />
      </section>
    </div>
  );
}
