import { useTranslations, useLocale } from "next-intl";
import {
  ArrowRight,
  Clock3,
  Flame,
  Rocket,
  Trophy,
  TrendingDown,
  TrendingUp,
  Users2,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/frontend/utils";
import { Link } from "@/i18n/navigation";
import { MiniBars, Sparkline } from "./sparkline";
import {
  getFeaturedLaunch,
  getRecentActivity,
  getTopMakers,
  MOMENTUM_BARS,
  MOMENTUM_COUNT,
  MOMENTUM_DELTA_PERCENT,
  type LandingLocale,
} from "./data";

/** Shared shell for the 4 hero dashboard cards (subtle glass on lavender). */
function DashCard({
  title,
  icon,
  children,
  footer,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  footer?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-[22px] border bg-white/85 p-5 shadow-soft backdrop-blur-sm",
        "transition-shadow duration-300 hover:shadow-lift",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-primary" aria-hidden>
          {icon}
        </span>
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      <div className="mt-4 flex-1">{children}</div>
      {footer && (
        <Link
          href={footer.href}
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          {footer.label}
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      )}
    </div>
  );
}

function TrendArrow({ trend, upLabel, downLabel }: { trend: "up" | "down"; upLabel: string; downLabel: string }) {
  return trend === "up" ? (
    <TrendingUp className="h-3.5 w-3.5 text-[#0F8F8A]" aria-label={upLabel} />
  ) : (
    <TrendingDown className="h-3.5 w-3.5 text-[#D9289D]" aria-label={downLabel} />
  );
}

export function Hero() {
  const t = useTranslations("home.hero");
  const locale = useLocale() as LandingLocale;
  const f = getFeaturedLaunch(locale);
  const topMakers = getTopMakers();
  const recentActivity = getRecentActivity(locale);

  return (
    <section className="relative overflow-hidden bg-[#EDFBFC]">
      {/* Soft radial brand washes */}
      <div
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(560px_circle_at_12%_0%,rgba(0,100,214,0.10),transparent_60%),radial-gradient(640px_circle_at_92%_18%,rgba(0,74,173,0.08),transparent_60%)]"
        aria-hidden
      />

      <div className="container-page relative grid items-center gap-12 py-16 lg:grid-cols-[1fr_1.05fr] lg:py-20">
        {/* ------------------------------------------------------ Copy column */}
        <div className="space-y-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-foreground">
            <Users2 className="h-3.5 w-3.5 text-primary" aria-hidden />
            {t("badge")}
          </span>

          <h1 className="text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-5xl lg:text-[3.4rem]">
            {t("titleLead")} <span className="text-primary">{t("titleHighlight")}</span>
          </h1>

          <p className="max-w-lg text-lg text-muted-foreground">{t("subtitle")}</p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/submit"
              className={cn(buttonVariants({ variant: "gradient", size: "lg" }), "shadow-lift")}
            >
              <Rocket className="h-5 w-5" aria-hidden />
              {t("ctaPrimary")}
            </Link>
            <Link href="/launches" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              {t("ctaSecondary")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>

        {/* ------------------------------------------- Dashboard card cluster */}
        <div className="grid gap-4 sm:grid-cols-2">
          <DashCard
            title={t("topCommunity")}
            icon={<Trophy className="h-4 w-4" />}
            footer={{ label: t("viewFullRanking"), href: "/leaderboard" }}
          >
            <ol className="space-y-2.5">
              {topMakers.map((m) => (
                <li key={m.rank} className="flex items-center gap-2.5 text-sm">
                  <span className="w-4 text-xs font-semibold text-muted-foreground/70">{m.rank}</span>
                  <span
                    className="brand-gradient flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    aria-hidden
                  >
                    {m.initials}
                  </span>
                  <span className="flex-1 truncate font-semibold">{m.name}</span>
                  <span className="text-sm font-bold text-primary">{m.points}</span>
                  <TrendArrow trend={m.trend} upLabel={t("trendUp")} downLabel={t("trendDown")} />
                </li>
              ))}
            </ol>
          </DashCard>

          <DashCard title={t("trendingNow")} icon={<Flame className="h-4 w-4" />}>
            <div className="flex items-start gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold text-white"
                style={{ backgroundColor: f.color }}
                aria-hidden
              >
                {f.initial}
              </span>
              <div>
                <p className="font-bold leading-tight">{f.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("trendingBlurb")}</p>
              </div>
            </div>
            <Sparkline data={f.spark} filled width={200} height={56} className="mt-4 w-full" />
            <div className="mt-3 flex items-center justify-between">
              <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
                {f.category}
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-primary" aria-hidden />
                {t("votesCount", { count: f.votes })}
              </span>
            </div>
          </DashCard>

          <DashCard
            title={t("recentActivity")}
            icon={<Clock3 className="h-4 w-4" />}
            footer={{ label: t("viewAllActivity"), href: "/launches" }}
          >
            <ul className="space-y-3">
              {recentActivity.map((a) => (
                <li key={`${a.actor}-${a.target}`} className="flex items-center gap-2.5">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground"
                    aria-hidden
                  >
                    {a.initials}
                  </span>
                  <p className="flex-1 truncate text-xs">
                    <span className="font-semibold">{a.actor}</span>{" "}
                    <span className="text-muted-foreground">{a.action}</span>{" "}
                    <span className="font-semibold">{a.target}</span>
                  </p>
                  <span className="shrink-0 text-[10px] text-muted-foreground/70">{a.when}</span>
                </li>
              ))}
            </ul>
          </DashCard>

          <DashCard title={t("communityMomentum")} icon={<Users2 className="h-4 w-4" />}>
            <p className="text-xs font-semibold text-muted-foreground">{t("thisWeek")}</p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <div>
                <p className="text-4xl font-extrabold tracking-tight text-primary">{MOMENTUM_COUNT}</p>
                <p className="text-xs text-muted-foreground">{t("newVotes")}</p>
              </div>
              <MiniBars data={MOMENTUM_BARS} className="h-14 w-28" />
            </div>
            <p className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#0F8F8A]">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden />
              {t("vsLastWeek", { percent: MOMENTUM_DELTA_PERCENT })}
            </p>
          </DashCard>
        </div>
      </div>
    </section>
  );
}
