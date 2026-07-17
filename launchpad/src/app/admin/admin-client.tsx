"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Check, ExternalLink, Flag, Trophy, X } from "lucide-react";
import {
  fetchCommunityLinksByStatus,
  fetchReports,
  moderateCommunityLink,
  resolveReport,
} from "@/lib/frontend/api-client";
import { mockCommunityLinks, mockReports } from "@/lib/frontend/mock-data";
import { useApi } from "@/lib/frontend/hooks";
import { timeAgo } from "@/lib/frontend/format";
import type { CommunityLink, ModerationReportItem, ReportCategory, ReportStatus } from "@/lib/frontend/types";
import { StatsSection } from "@/components/admin/stats-section";
import { UsersSection } from "@/components/admin/users-section";
import { ProductsSection } from "@/components/admin/products-section";
import { CollectionsSection } from "@/components/admin/collections-section";
import { BadgesSection } from "@/components/admin/badges-section";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DemoBanner, EmptyState, ErrorState } from "@/components/ui/states";

const REPORT_STATUS_META: Record<ReportStatus, { label: string; variant: "warning" | "secondary" | "success" | "outline" }> = {
  OPEN: { label: "Abierto", variant: "warning" },
  REVIEWING: { label: "En revisión", variant: "secondary" },
  RESOLVED: { label: "Resuelto", variant: "success" },
  DISMISSED: { label: "Descartado", variant: "outline" },
};

const REPORT_CATEGORY_LABEL: Record<ReportCategory, string> = {
  SPAM: "Spam",
  SCAM: "Estafa o fraude",
  INAPPROPRIATE: "Contenido inapropiado",
  OTHER: "Otro",
};

type Section = "stats" | "users" | "products" | "collections" | "badges" | "reports" | "links";

export function AdminClient() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [section, setSection] = useState<Section>("reports");

  // useSession() can resolve after the first render — without this, an
  // ADMIN would land on "reports" instead of "stats" until they click
  // around. MODERATOR (isAdmin === false) stays on "reports".
  useEffect(() => {
    if (isAdmin) setSection((s) => (s === "reports" ? "stats" : s));
  }, [isAdmin]);

  const items: { value: Section; label: string }[] = [
    ...(isAdmin
      ? [
          { value: "stats" as const, label: "Resumen" },
          { value: "users" as const, label: "Usuarios" },
          { value: "products" as const, label: "Productos" },
          { value: "collections" as const, label: "Colecciones" },
          { value: "badges" as const, label: "Insignias" },
        ]
      : []),
    { value: "reports", label: "Reportes" },
    { value: "links", label: "Logros de la extensión" },
  ];

  return (
    <div className="space-y-6">
      <Tabs items={items} value={section} onChange={setSection} />
      {section === "stats" && <StatsSection onGoToTab={setSection} />}
      {section === "users" && <UsersSection />}
      {section === "products" && <ProductsSection />}
      {section === "collections" && <CollectionsSection />}
      {section === "badges" && <BadgesSection />}
      {section === "reports" && <ReportsQueue />}
      {section === "links" && <CommunityLinksQueue />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reports queue — GET /api/reports, PATCH /api/reports/:id
// ---------------------------------------------------------------------------

function ReportsQueue() {
  const { data, loading, error, demo, refetch, setData } = useApi(() => fetchReports(), {
    fallback: () => mockReports,
  });
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(id: string, status: Exclude<ReportStatus, "OPEN">) {
    setBusyId(id);
    try {
      const updated = await resolveReport(id, status);
      // Reflect the new status locally (keeps resolvedAt/By from the response).
      setData((prev) =>
        prev
          ? prev.map((r) =>
              r.id === id
                ? { ...r, status: updated.status, resolvedAt: updated.resolvedAt ?? r.resolvedAt }
                : r
            )
          : prev
      );
    } catch {
      refetch();
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <QueueSkeleton />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const reports = data ?? [];
  const open = reports.filter((r) => r.status === "OPEN" || r.status === "REVIEWING");

  return (
    <div className="space-y-4">
      {demo && <DemoBanner />}
      <div className="flex flex-wrap gap-3">
        <StatCard label="Sin resolver" value={open.length} tone="warning" />
        <StatCard label="Total reportes" value={reports.length} tone="muted" />
      </div>

      {reports.length === 0 ? (
        <EmptyState
          title="Bandeja limpia ✨"
          description="No hay reportes pendientes. La comunidad se porta bien."
        />
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <ReportRow key={r.id} report={r} busy={busyId === r.id} onAct={act} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReportRow({
  report,
  busy,
  onAct,
}: {
  report: ModerationReportItem;
  busy: boolean;
  onAct: (id: string, status: Exclude<ReportStatus, "OPEN">) => void;
}) {
  const meta = REPORT_STATUS_META[report.status];
  const resolved = report.status === "RESOLVED" || report.status === "DISMISSED";
  const target = report.product
    ? { label: report.product.name, href: `/products/${report.product.slug}` }
    : report.comment
      ? { label: `Comentario: "${report.comment.body.slice(0, 60)}…"`, href: null }
      : report.collaboration
        ? { label: report.collaboration.title, href: `/colaboraciones/${report.collaboration.id}` }
        : { label: "Contenido eliminado", href: null };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={meta.variant}>{meta.label}</Badge>
            <Badge variant="outline">{REPORT_CATEGORY_LABEL[report.category]}</Badge>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Flag className="h-3 w-3" aria-hidden />
              {report.product ? "Producto" : report.comment ? "Comentario" : "Colaboración"} · {timeAgo(report.createdAt)}
            </span>
          </div>

          <p className="font-semibold">
            {target.href ? (
              <Link href={target.href} className="inline-flex items-center gap-1 hover:text-primary">
                {target.label}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : (
              target.label
            )}
          </p>

          <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-foreground/90">
            "{report.reason}"
          </p>

          <p className="text-xs text-muted-foreground">
            {report.reporter ? `Reportado por ${report.reporter.name}` : "🤖 Auto-detectado por el sistema"}
            {report.resolvedBy && ` · resuelto por ${report.resolvedBy.name}`}
          </p>
        </div>

        {!resolved && (
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => onAct(report.id, "DISMISSED")}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Descartar
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={busy}
              onClick={() => onAct(report.id, "RESOLVED")}
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              Resolver
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Community links queue — GET /api/community-links?status=PENDING (staff),
// PATCH /api/community-links/:id. Mock fallback only if the API is down.
// ---------------------------------------------------------------------------

function CommunityLinksQueue() {
  const { data, loading, error, demo, refetch, setData } = useApi(
    () => fetchCommunityLinksByStatus("PENDING"),
    { fallback: () => mockCommunityLinks.map((l) => ({ ...l, status: "PENDING" as const })) }
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(id: string, status: "VERIFIED" | "REJECTED") {
    setBusyId(id);
    try {
      await moderateCommunityLink(id, status);
      setData((prev) => (prev ? prev.map((l) => (l.id === id ? { ...l, status } : l)) : prev));
    } catch (err) {
      if (demo) {
        // Demo mode: the id is a mock; just update the UI locally.
        setData((prev) => (prev ? prev.map((l) => (l.id === id ? { ...l, status } : l)) : prev));
      } else {
        refetch();
      }
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <QueueSkeleton />;
  // This queue always has a fallback, so `error` should be rare; handle anyway.
  if (error && !data) return <ErrorState message={error} onRetry={refetch} />;

  const links = data ?? [];
  const pending = links.filter((l) => l.status === "PENDING");

  return (
    <div className="space-y-4">
      {demo && <DemoBanner />}
      <p className="rounded-xl border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
        Los logros llegan desde la extensión como <strong>pendientes</strong>. Verifica que sean
        posts públicos y reales antes de publicarlos. Nada se vota ni se toca en Skool desde aquí.
      </p>

      {pending.length === 0 ? (
        <EmptyState title="Sin logros pendientes" description="Todo revisado por ahora. 🎉" />
      ) : (
        <ul className="space-y-3">
          {links.map((l) => (
            <LinkRow key={l.id} link={l} busy={busyId === l.id} onAct={act} />
          ))}
        </ul>
      )}
    </div>
  );
}

function LinkRow({
  link,
  busy,
  onAct,
}: {
  link: CommunityLink;
  busy: boolean;
  onAct: (id: string, status: "VERIFIED" | "REJECTED") => void;
}) {
  const settled = link.status !== "PENDING";
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white">
            <Trophy className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{link.title}</p>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-primary"
            >
              {link.url}
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
            </a>
            <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Avatar name={link.submittedBy.name} src={link.submittedBy.avatarUrl} size="xs" />
              {link.submittedBy.name} · {link.type} · {timeAgo(link.createdAt)}
            </p>
          </div>
        </div>

        {settled ? (
          <Badge variant={link.status === "VERIFIED" ? "success" : "outline"}>
            {link.status === "VERIFIED" ? "Verificado" : "Rechazado"}
          </Badge>
        ) : (
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => onAct(link.id, "REJECTED")}>
              <X className="h-3.5 w-3.5" aria-hidden />
              Rechazar
            </Button>
            <Button size="sm" disabled={busy} onClick={() => onAct(link.id, "VERIFIED")}>
              <Check className="h-3.5 w-3.5" aria-hidden />
              Verificar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function StatCard({ label, value, tone }: { label: string; value: number; tone: "warning" | "muted" }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3 shadow-soft">
      <p className={tone === "warning" ? "text-2xl font-extrabold text-warning" : "text-2xl font-extrabold"}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-2xl" />
      ))}
    </div>
  );
}
