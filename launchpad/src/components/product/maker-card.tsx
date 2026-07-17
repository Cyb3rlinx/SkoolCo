import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import type { MakerRef } from "@/lib/frontend/types";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

/** Maker block for the detail sidebar — links to the public maker profile. */
export function MakerCard({ maker }: { maker: MakerRef }) {
  return (
    <Card className="transition-shadow hover:shadow-lift">
      <Link href={`/makers/${maker.id}`} aria-label={`Ver perfil de ${maker.name}`}>
        <CardContent className="flex items-center gap-3 p-5">
          <Avatar name={maker.name} src={maker.avatarUrl} size="lg" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Maker
            </p>
            <p className="flex items-center gap-1.5 truncate font-bold">
              {maker.name}
              {maker.verifiedAt && (
                <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Maker verificado" />
              )}
            </p>
            <p className="text-xs text-muted-foreground">Ver perfil y lanzamientos →</p>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
