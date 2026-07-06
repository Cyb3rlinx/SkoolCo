import { BadgeCheck } from "lucide-react";
import type { UserRef } from "@/lib/frontend/types";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Maker block for the detail sidebar.
 * TODO(backend): there is no public GET /api/users/:id yet — when it exists,
 * link this card to a public maker profile page.
 */
export function MakerCard({ maker }: { maker: UserRef }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <Avatar name={maker.name} src={maker.avatarUrl} size="lg" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Maker
          </p>
          <p className="flex items-center gap-1.5 truncate font-bold">
            {maker.name}
            <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Miembro de la comunidad" />
          </p>
          <p className="text-xs text-muted-foreground">Miembro de la comunidad</p>
        </div>
      </CardContent>
    </Card>
  );
}
