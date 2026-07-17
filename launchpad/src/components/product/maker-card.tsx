import { BadgeCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MakerRef } from "@/lib/frontend/types";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

/** Maker block for the detail sidebar — links to the public maker profile. */
export function MakerCard({ maker }: { maker: MakerRef }) {
  const t = useTranslations("product.makerCard");
  return (
    <Card className="transition-shadow hover:shadow-lift">
      <Link href={`/makers/${maker.id}`} aria-label={t("viewProfileOf", { name: maker.name })}>
        <CardContent className="flex items-center gap-3 p-5">
          <Avatar name={maker.name} src={maker.avatarUrl} size="lg" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("maker")}
            </p>
            <p className="flex items-center gap-1.5 truncate font-bold">
              {maker.name}
              {maker.verifiedAt && (
                <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label={t("verified")} />
              )}
            </p>
            <p className="text-xs text-muted-foreground">{t("viewProfile")}</p>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
