"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { fetchComments, postComment } from "@/lib/frontend/api-client";
import { mockCommentsByProduct, paginate } from "@/lib/frontend/mock-data";
import { useApi, useMutation } from "@/lib/frontend/hooks";
import { timeAgo } from "@/lib/frontend/format";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { DemoBanner, ErrorState } from "@/components/ui/states";
import { Link, usePathname } from "@/i18n/navigation";

/**
 * Comments block for the product detail page.
 * Data: GET/POST /api/products/:slug/comments. New comments are prepended
 * locally after a successful POST (the API returns the created comment).
 */
export function CommentSection({ slug, live }: { slug: string; live: boolean }) {
  const t = useTranslations("product.comments");
  const locale = useLocale();
  const { status } = useSession();
  const pathname = usePathname();
  const [body, setBody] = useState("");

  const { data, loading, error, demo, refetch, setData } = useApi(
    () => fetchComments(slug),
    {
      fallback: () => paginate(mockCommentsByProduct[slug] ?? []),
      deps: [slug],
    }
  );

  const { mutate, submitting, error: submitError, clearError } = useMutation(postComment);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    const comment = await mutate(slug, text);
    if (comment) {
      setBody("");
      setData((prev) =>
        prev
          ? { ...prev, total: prev.total + 1, items: [comment, ...prev.items] }
          : prev
      );
    }
  }

  const total = data?.total ?? 0;

  return (
    <section aria-labelledby="comments-title" className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 id="comments-title" className="text-xl font-extrabold">
          {t("title")} {total > 0 && <span className="text-muted-foreground">({total})</span>}
        </h2>
        {demo && <DemoBanner />}
      </div>

      {/* Composer */}
      {status === "authenticated" ? (
        live ? (
          <form onSubmit={onSubmit} className="space-y-3">
            <Textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                if (submitError) clearError();
              }}
              placeholder={t("placeholder")}
              aria-label={t("writeComment")}
              maxLength={2000}
              required
            />
            {submitError && <Alert variant="destructive">{submitError}</Alert>}
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting || body.trim().length === 0}>
                {submitting ? t("posting") : t("comment")}
              </Button>
            </div>
          </form>
        ) : (
          <Alert>{t("notLive")}</Alert>
        )
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed bg-muted/40 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{t("joinConversation")}</p>
          <Link
            href={`/login?next=${encodeURIComponent(pathname)}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {t("loginToComment")}
          </Link>
        </div>
      )}

      {/* List */}
      {loading && (
        <div className="space-y-4" aria-busy="true">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && data && data.items.length === 0 && (
        <p className="rounded-2xl border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      )}

      {!loading && !error && (
        <ul className="space-y-4">
          {data?.items.map((c) => (
            <li key={c.id} className="flex gap-3 rounded-2xl border bg-card p-4 shadow-soft">
              <Avatar name={c.user.name} src={c.user.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-bold">{c.user.name}</span>{" "}
                  <span className="text-xs text-muted-foreground">· {timeAgo(c.createdAt, locale)}</span>
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-foreground/90">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
