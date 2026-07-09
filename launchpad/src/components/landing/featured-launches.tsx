import Link from "next/link";
import { ArrowRight, ChevronUp, MessageCircle, Star } from "lucide-react";
import { cn } from "@/lib/frontend/utils";
import { Sparkline } from "./sparkline";
import { FEATURED_LAUNCH, LAUNCHES, type LaunchItem } from "./data";

function ProductTile({ item, size = "md" }: { item: LaunchItem; size?: "md" | "lg" }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center font-extrabold text-white",
        size === "lg" ? "h-20 w-20 rounded-[22px] text-3xl shadow-lift" : "h-11 w-11 rounded-xl text-lg"
      )}
      style={{ backgroundColor: item.color }}
      aria-hidden
    >
      {item.initial}
    </span>
  );
}

function VoteButton({ votes }: { votes: number }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-xl border bg-white px-3.5 py-2 text-sm font-bold text-primary shadow-soft transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-lift"
      aria-label={`${votes} votos`}
    >
      <ChevronUp className="h-4 w-4" aria-hidden />
      {votes}
    </span>
  );
}

export function FeaturedLaunches() {
  const f = FEATURED_LAUNCH;
  return (
    <section className="container-page py-16 lg:py-20">
      <div className="mb-8 flex items-end justify-between gap-4">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Lanzamientos destacados
        </h2>
        <Link
          href="/launches"
          className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline sm:inline-flex"
        >
          Ver todos los lanzamientos
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      {/* -------------------------------------------------- Top launch card */}
      <Link
        href="/launches"
        className="group block rounded-[26px] border bg-white p-6 shadow-soft transition-shadow duration-300 hover:shadow-lift sm:p-8"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-accent-foreground">
          <Star className="h-3 w-3" aria-hidden />
          Top lanzamiento del día
        </span>

        <div className="mt-5 grid items-center gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div className="flex items-start gap-5">
            <ProductTile item={f} size="lg" />
            <div className="space-y-3">
              <h3 className="text-2xl font-extrabold tracking-tight">{f.name}</h3>
              <p className="max-w-md text-muted-foreground">{f.tagline}</p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                <span className="rounded-full bg-accent px-2.5 py-1 font-semibold text-accent-foreground">
                  {f.category}
                </span>
                <span className="flex items-center gap-1.5 font-semibold">
                  <span
                    className="brand-gradient flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold text-white"
                    aria-hidden
                  >
                    {f.makerInitials}
                  </span>
                  {f.maker}
                </span>
                <span className="flex items-center gap-1 font-semibold text-muted-foreground">
                  <ChevronUp className="h-3.5 w-3.5 text-primary" aria-hidden />
                  {f.votes} votos
                </span>
              </div>
            </div>
          </div>
          <Sparkline data={f.spark} filled width={320} height={96} className="hidden w-full lg:block" />
        </div>
      </Link>

      {/* ------------------------------------------------------ Ranked rows */}
      <ul className="mt-4 space-y-3">
        {LAUNCHES.map((item) => (
          <li key={item.rank}>
            <Link
              href="/launches"
              className="group flex items-center gap-4 rounded-[22px] border bg-white p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift sm:px-6"
            >
              <span className="w-5 text-center text-sm font-bold text-muted-foreground/70">
                {item.rank}
              </span>
              <ProductTile item={item} />
              <div className="min-w-0 flex-1">
                <p className="font-bold leading-tight">{item.name}</p>
                <p className="truncate text-sm text-muted-foreground">{item.tagline}</p>
              </div>

              <span className="hidden rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground lg:inline">
                {item.category}
              </span>
              <span className="hidden items-center gap-1.5 text-xs font-semibold text-muted-foreground md:flex">
                <span
                  className="brand-gradient flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold text-white"
                  aria-hidden
                >
                  {item.makerInitials}
                </span>
                {item.maker}
              </span>
              <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                {item.comments}
              </span>
              <Sparkline data={item.spark} width={72} height={24} className="hidden h-6 w-[72px] xl:block" />
              <VoteButton votes={item.votes} />
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6 sm:hidden">
        <Link
          href="/launches"
          className="flex items-center justify-center gap-1 rounded-xl border bg-white py-3 text-sm font-semibold"
        >
          Ver todos los lanzamientos
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
