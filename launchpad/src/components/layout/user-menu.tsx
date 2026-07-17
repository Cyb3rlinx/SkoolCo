"use client";

import { useCallback, useRef, useState } from "react";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Rocket, Shield, UserRound } from "lucide-react";
import { useClickOutside } from "@/lib/frontend/use-click-outside";
import { Avatar } from "@/components/ui/avatar";
import { Link } from "@/i18n/navigation";

/** Avatar dropdown for the signed-in user (profile, moderation, sign out). */
export function UserMenu() {
  const t = useTranslations("userMenu");
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, useCallback(() => setOpen(false), []));

  const user = session?.user;
  if (!user) return null;

  const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";

  const itemClass =
    "flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("userMenu")}
        aria-expanded={open}
        className="flex items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Avatar name={user.name ?? t("defaultName")} src={user.image} size="sm" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border bg-card py-1 shadow-lift">
          <div className="border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold">{user.name}</p>
              {isStaff && (
                <span className="shrink-0 rounded-full bg-gradient-to-r from-[#22d3ee] to-[#2563eb] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  {user.role === "ADMIN" ? "Admin" : "Mod"}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Link href="/profile" onClick={() => setOpen(false)} className={itemClass}>
            <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden />
            {t("myProfile")}
          </Link>
          <Link href="/submit" onClick={() => setOpen(false)} className={itemClass}>
            <Rocket className="h-4 w-4 text-muted-foreground" aria-hidden />
            {t("publishProduct")}
          </Link>
          {isStaff && (
            // Plain (non-locale-prefixed) link: /admin is intentionally
            // outside the i18n routing setup (see src/middleware.ts).
            <NextLink href="/admin" onClick={() => setOpen(false)} className={itemClass}>
              <Shield className="h-4 w-4 text-muted-foreground" aria-hidden />
              {t("adminPanel")}
            </NextLink>
          )}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className={`${itemClass} w-full border-t text-destructive`}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {t("signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
