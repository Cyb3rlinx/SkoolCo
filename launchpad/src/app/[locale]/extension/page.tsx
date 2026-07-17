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
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ExtensionPopupMock } from "@/components/extension/extension-popup-mock";
import { LogrosWall } from "@/components/extension/logros-wall";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("extension.page");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function ExtensionPage() {
  const t = await getTranslations("extension.page");

  const STEPS = [
    { icon: MousePointerClick, title: t("step1Title"), body: t("step1Body") },
    { icon: Hand, title: t("step2Title"), body: t("step2Body") },
    { icon: Trophy, title: t("step3Title"), body: t("step3Body") },
  ];

  const NEVER = [t("never1"), t("never2"), t("never3"), t("never4"), t("never5")];
  const ALWAYS = [t("always1"), t("always2"), t("always3"), t("always4"), t("always5")];

  return (
    <div className="space-y-20 pb-20">
      {/* Hero */}
      <section className="border-b bg-muted/30">
        <div className="container-page grid items-center gap-12 py-16 lg:grid-cols-[1fr_auto]">
          <div className="space-y-6">
            <Badge variant="secondary">
              <Puzzle className="h-3.5 w-3.5" aria-hidden />
              {t("badge")}
            </Badge>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              {t("titleLead")} <span className="brand-text-gradient">{t("titleHighlight")}</span>{" "}
              {t("titleTail")}
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              {t("heroBody1")} <strong>{t("heroBodyStrong")}</strong> {t("heroBody2")}
            </p>
            <Alert variant="success">
              <strong>{t("consentFirst")}</strong> {t("consentFirstBody")}
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
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t("howItWorks")}</h2>
          <p className="mt-2 text-muted-foreground">{t("howItWorksSubtitle")}</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Card key={step.title}>
              <CardContent className="space-y-3 p-6">
                <div className="flex items-center gap-3">
                  <span className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white">
                    <step.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-sm font-bold text-muted-foreground">{t("step", { number: i + 1 })}</span>
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
            {t("commitmentBadge")}
          </Badge>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{t("neverTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("neverSubtitle")}</p>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
          <Card className="border-destructive/25">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-2 font-extrabold text-destructive">
                <Ban className="h-5 w-5" aria-hidden />
                {t("neverHeading")}
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
                {t("alwaysHeading")}
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
            <strong className="text-foreground">{t("privacyByDesign")}</strong> {t("privacyByDesignBody")}
          </p>
        </div>
      </section>

      {/* Logros wall */}
      <section className="container-page">
        <div className="mb-8 flex flex-col items-center text-center">
          <Badge variant="gradient">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t("wallBadge")}
          </Badge>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{t("wallTitle")}</h2>
          <p className="mt-2 max-w-xl text-muted-foreground">{t("wallSubtitle")}</p>
        </div>
        <LogrosWall />
      </section>
    </div>
  );
}
