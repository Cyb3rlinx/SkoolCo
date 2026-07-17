"use client";

import { useState, type FormEvent } from "react";
import { usePathname as useRawPathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import NextLink from "next/link";
import { Menu, Plus, Search, Shield, UserRound, X } from "lucide-react";
import { cn } from "@/lib/frontend/utils";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "./logo";
import { NotificationsBell } from "./notifications-bell";
import { UserMenu } from "./user-menu";
import { LanguageSwitcher } from "./language-switcher";
import { SearchAutocomplete } from "./search-autocomplete";

export function SiteHeader() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const rawPathname = useRawPathname();
  const isAdmin = rawPathname?.startsWith("/admin") ?? false;
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");

  const NAV_LINKS = [
    { href: "/launches", label: t("launches") },
    { href: "/colecciones", label: t("collections") },
    { href: "/colaboraciones", label: t("collaborations") },
    { href: "/leaderboard", label: t("leaderboard") },
    { href: "/extension", label: t("extension") },
  ];

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    setMobileOpen(false);
    router.push(q ? `/launches?q=${encodeURIComponent(q)}` : "/launches");
  }

  const navLink = (href: string, label: string, extra?: string) => (
    <Link
      key={href}
      href={href}
      onClick={() => setMobileOpen(false)}
      className={cn(
        "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
        pathname === href || pathname.startsWith(`${href}/`)
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        extra
      )}
    >
      {label}
    </Link>
  );

  const authed = status === "authenticated";
  const isStaff = session?.user?.role === "ADMIN" || session?.user?.role === "MODERATOR";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-3">
        <Logo />

        {/* Desktop nav */}
        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label={t("mainNav")}>
          {NAV_LINKS.map((l) => navLink(l.href, l.label))}
        </nav>

        {/* Search (desktop) */}
        <SearchAutocomplete className="ml-auto hidden w-56 lg:block" />

        <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
          {!isAdmin && <LanguageSwitcher className="hidden sm:flex" />}
          <NotificationsBell />

          {authed ? (
            <>
              {isStaff && (
                <NextLink
                  href="/admin"
                  aria-label={t("adminLabel")}
                  className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "hidden sm:inline-flex")}
                >
                  <Shield className="h-4 w-4" aria-hidden />
                </NextLink>
              )}
              <Link
                href="/profile"
                aria-label={t("profileLabel")}
                className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "hidden sm:inline-flex")}
              >
                <UserRound className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/submit" className={cn(buttonVariants({ variant: "gradient", size: "sm" }), "hidden sm:inline-flex")}>
                <Plus className="h-4 w-4" aria-hidden />
                {t("publish")}
              </Link>
              <UserMenu />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}
              >
                {t("login")}
              </Link>
              <Link href="/signup" className={cn(buttonVariants({ variant: "gradient", size: "sm" }), "hidden sm:inline-flex")}>
                {t("signup")}
              </Link>
            </>
          )}

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </Button>
        </div>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <div className="border-t bg-card md:hidden">
          <div className="container-page flex flex-col gap-2 py-4">
            <form onSubmit={onSearch} role="search" className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                aria-label={t("searchLabel")}
                className="pl-9"
              />
            </form>
            <nav className="flex flex-col" aria-label={t("mobileNav")}>
              {NAV_LINKS.map((l) => navLink(l.href, l.label))}
            </nav>
            {!isAdmin && <LanguageSwitcher className="self-start" />}
            <div className="flex flex-col gap-2 border-t pt-3">
              {authed ? (
                <Link
                  href="/submit"
                  onClick={() => setMobileOpen(false)}
                  className={buttonVariants({ variant: "gradient" })}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  {t("publishProduct")}
                </Link>
              ) : (
                <>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className={buttonVariants({ variant: "gradient" })}
                  >
                    {t("signup")}
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className={buttonVariants({ variant: "outline" })}
                  >
                    {t("loginFull")}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
