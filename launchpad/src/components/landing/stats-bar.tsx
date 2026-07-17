import { useTranslations } from "next-intl";
import { Clock3, Rocket, ShieldCheck, Users2 } from "lucide-react";

export function StatsBar() {
  const t = useTranslations("home.stats");
  const STATS = [
    { icon: Rocket, value: "9K+", label: t("productsLaunched") },
    { icon: Users2, value: "6K+", label: t("activeMakers") },
    { icon: ShieldCheck, value: "100%", label: t("realVotes") },
    { icon: Clock3, value: "24/7", label: t("activeCommunity") },
  ];

  return (
    <section className="border-y bg-white">
      <div className="container-page grid grid-cols-2 gap-x-4 gap-y-8 py-10 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="flex items-center gap-3.5">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary"
              aria-hidden
            >
              <s.icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-xl font-extrabold tracking-tight">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
