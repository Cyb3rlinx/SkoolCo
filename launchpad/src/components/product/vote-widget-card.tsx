"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Solo visible para el maker dueño — widget de voto embebible con snippet copiable. */
export function VoteWidgetCard({ slug, makerId }: { slug: string; makerId: string }) {
  const { data: session } = useSession();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [copied, setCopied] = useState(false);

  if (session?.user?.id !== makerId) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://denveler.com";
  const widgetUrl = `${origin}/api/vote-widget.svg?product=${slug}&theme=${theme}`;
  const embedSnippet = `<a href="${origin}/products/${slug}"><img src="${widgetUrl}" alt="Vótame en Denveler" /></a>`;

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(embedSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — el textarea sigue seleccionable a mano.
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5 text-sm">
        <p className="font-semibold">Widget "Vótame en Denveler"</p>
        <p className="text-xs text-muted-foreground">
          Muestra tu conteo de votos en vivo. Al hacer clic, lleva a tu producto en Denveler para votar.
        </p>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={widgetUrl} alt="Vótame en Denveler" width={240} height={72} />
        </div>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={theme === "dark" ? "font-bold underline" : "text-muted-foreground"}
          >
            Oscuro
          </button>
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={theme === "light" ? "font-bold underline" : "text-muted-foreground"}
          >
            Claro
          </button>
        </div>
        <textarea
          readOnly
          value={embedSnippet}
          className="w-full rounded border bg-muted/40 p-2 font-mono text-xs"
          rows={2}
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
        />
        <Button type="button" variant="outline" size="sm" onClick={copySnippet}>
          {copied ? "Copiado ✓" : "Copiar"}
        </Button>
      </CardContent>
    </Card>
  );
}
