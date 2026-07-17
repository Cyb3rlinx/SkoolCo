"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { fetchCategories } from "@/lib/frontend/api-client";
import { mockCategories } from "@/lib/frontend/mock-data";
import { useApi } from "@/lib/frontend/hooks";
import { formatDate } from "@/lib/frontend/format";
import type { ProductListQuery } from "@/lib/frontend/types";
import { PageHeader } from "@/components/layout/page-header";
import { ProductFeed } from "@/components/product/product-feed";
import { Tabs } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";

type Window = "today" | "week" | "all";

export function LaunchesClient() {
  const t = useTranslations("launches");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const TAB_ITEMS: { value: Window; label: string }[] = [
    { value: "today", label: t("tabToday") },
    { value: "week", label: t("tabWeek") },
    { value: "all", label: t("tabAll") },
  ];

  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const sort = (searchParams.get("sort") as "newest" | "top" | "trending" | null) ?? "newest";
  const windowParam = (searchParams.get("window") as Window | null) ?? "today";
  const openToOffers = searchParams.get("openToOffers") === "1";

  /** Update one query param while keeping the rest (shareable URLs). */
  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.replace(`/launches?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const { data: categories } = useApi(fetchCategories, {
    fallback: () => mockCategories,
  });

  const query: ProductListQuery = useMemo(
    () => ({
      q: q || undefined,
      category: category || undefined,
      openToOffers: openToOffers || undefined,
      sort,
      pageSize: 50,
    }),
    [q, category, openToOffers, sort]
  );

  const heading =
    windowParam === "today" ? t("headingToday") : windowParam === "week" ? t("headingWeek") : t("headingAll");

  return (
    <div className="container-page space-y-8 py-10">
      <PageHeader
        title={heading}
        description={t("subheading", { date: formatDate(new Date(), locale) })}
        actions={
          <Link href="/submit" className={buttonVariants({ variant: "gradient" })}>
            <Sparkles className="h-4 w-4" aria-hidden />
            {t("publishYours")}
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <Tabs items={TAB_ITEMS} value={windowParam} onChange={(v) => setParam("window", v === "today" ? "" : v)} />

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={openToOffers}
            onChange={(e) => setParam("openToOffers", e.target.checked ? "1" : "")}
            className="h-4 w-4 rounded border-input"
          />
          Solo abiertos a ofertas
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-auto lg:min-w-[540px]">
          <div className="space-y-1.5">
            <Label htmlFor="filter-q">{t("search")}</Label>
            <Input
              id="filter-q"
              defaultValue={q}
              key={q} /* re-sync when header search navigates here */
              placeholder={t("searchPlaceholder")}
              onKeyDown={(e) => {
                if (e.key === "Enter") setParam("q", (e.target as HTMLInputElement).value.trim());
              }}
              onBlur={(e) => {
                if (e.target.value.trim() !== q) setParam("q", e.target.value.trim());
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-category">{t("category")}</Label>
            <Select
              id="filter-category"
              value={category}
              onChange={(e) => setParam("category", e.target.value)}
            >
              <option value="">{t("allCategories")}</option>
              {(categories ?? []).map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-sort">{t("sortBy")}</Label>
            <Select id="filter-sort" value={sort} onChange={(e) => setParam("sort", e.target.value === "newest" ? "" : e.target.value)}>
              <option value="newest">{t("sortNewest")}</option>
              <option value="top">{t("sortTop")}</option>
              <option value="trending">{t("sortTrending")}</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Feed */}
      <ProductFeed
        query={query}
        dateWindow={windowParam}
        ranked={windowParam !== "all" || sort === "top" || sort === "trending"}
        emptyTitle={windowParam === "today" ? t("emptyTodayTitle") : t("emptyOtherTitle")}
        emptyDescription={t("emptyDescription")}
        emptyAction={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => setParam("window", "all")}>
              {t("viewAllLaunches")}
            </Button>
            <Link href="/submit" className={buttonVariants({ variant: "gradient" })}>
              {t("publishMyProduct")}
            </Link>
          </div>
        }
      />
    </div>
  );
}
