"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Menu, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/frontend/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "./logo";
import { NotificationsBell } from "./notifications-bell";
import { UserMenu } from "./user-menu";

const NAV_LINKS = [
  { href: "/launches", label: "Lanzamientos" },
  { href: "/colecciones", label: "Colecciones" },
  { href: "/leaderboard", label: "Ranking" },
  { href: "/extension", label: "Extensión" },
  { href: "/#como-funciona", label: "Recursos" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");

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

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-3">
        <Logo />

        {/* Desktop nav */}
        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Principal">
          {NAV_LINKS.map((l) => navLink(l.href, l.label))}
        </nav>

        {/* Search (desktop) */}
        <form onSubmit={onSearch} role="search" className="relative ml-auto hidden w-56 lg:block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar productos…"
            aria-label="Buscar productos"
            className="h-9 pl-9"
          />
        </form>

        <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
          <NotificationsBell />

          {authed ? (
            <>
              <Link href="/submit" className={cn(buttonVariants({ variant: "gradient", size: "sm" }), "hidden sm:inline-flex")}>
                <Plus className="h-4 w-4" aria-hidden />
                Publicar
              </Link>
              <UserMenu />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}
              >
                Entrar
              </Link>
              <Link href="/signup" className={cn(buttonVariants({ variant: "gradient", size: "sm" }), "hidden sm:inline-flex")}>
                Crear cuenta
              </Link>
            </>
          )}

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
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
                placeholder="Buscar productos…"
                aria-label="Buscar productos"
                className="pl-9"
              />
            </form>
            <nav className="flex flex-col" aria-label="Principal móvil">
              {NAV_LINKS.map((l) => navLink(l.href, l.label))}
            </nav>
            <div className="flex flex-col gap-2 border-t pt-3">
              {authed ? (
                <Link
                  href="/submit"
                  onClick={() => setMobileOpen(false)}
                  className={buttonVariants({ variant: "gradient" })}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Publicar producto
                </Link>
              ) : (
                <>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className={buttonVariants({ variant: "gradient" })}
                  >
                    Crear cuenta
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className={buttonVariants({ variant: "outline" })}
                  >
                    Iniciar sesión
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
