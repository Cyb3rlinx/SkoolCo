"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { fetchProducts } from "@/lib/frontend/api-client";
import { ProductLogo } from "@/components/product/product-logo";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import type { ProductListItem } from "@/lib/frontend/types";

/**
 * Buscador con sugerencias en vivo: debounce de 250ms, hasta 5 resultados,
 * click en una sugerencia va directo al producto; Enter o submit va al
 * listado completo con el filtro aplicado (comportamiento anterior intacto).
 */
export function SearchAutocomplete({ className }: { className?: string }) {
  const t = useTranslations("nav");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ProductListItem[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const result = await fetchProducts({ q, pageSize: 5 });
        setSuggestions(result.items);
        setOpen(true);
      } catch {
        // La búsqueda es de cortesía — un fallo de red no debe romper el formulario.
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    setOpen(false);
    router.push(q ? `/launches?q=${encodeURIComponent(q)}` : "/launches");
  }

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <form onSubmit={onSubmit} role="search">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchLabel")}
          className="h-9 pl-9"
          autoComplete="off"
        />
      </form>

      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-xl border bg-card p-1 shadow-lift">
          {suggestions.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                  router.push(`/products/${p.slug}`);
                }}
              >
                <ProductLogo name={p.name} src={p.logoUrl} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{p.tagline}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
