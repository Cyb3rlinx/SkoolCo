import { useTranslations } from "next-intl";
import { Rocket, ThumbsUp, TrendingUp } from "lucide-react";

export function HowItWorks() {
  const t = useTranslations("home.howItWorks");
  const STEPS = [
    { icon: Rocket, title: t("step1Title"), body: t("step1Body") },
    { icon: ThumbsUp, title: t("step2Title"), body: t("step2Body") },
    { icon: TrendingUp, title: t("step3Title"), body: t("step3Body") },
  ];

  return (
    <section id="como-funciona" className="bg-[#F5FBFC]">
      <div className="container-page py-16 lg:py-20">
        <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">{t("title")}</h2>

        <div className="relative mt-12 grid gap-6 md:grid-cols-3">
          {/* Dotted connector between the cards (desktop only) */}
          <div
            className="absolute left-[16%] right-[16%] top-10 hidden border-t-2 border-dashed border-primary/25 md:block"
            aria-hidden
          />

          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="relative rounded-[22px] border bg-white p-7 shadow-soft transition-shadow duration-300 hover:shadow-lift"
            >
              <div className="flex items-center gap-3">
                <span className="brand-gradient flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white shadow-soft">
                  {i + 1}
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary" aria-hidden>
                  <step.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
              </div>
              <h3 className="mt-4 text-lg font-extrabold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
