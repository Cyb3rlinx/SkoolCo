"use client";

/* eslint-disable @next/next/no-img-element */
import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CalendarDays, ImagePlus, Link2, PartyPopper } from "lucide-react";
import { ApiClientError, createProduct, fetchCategories, uploadImage } from "@/lib/frontend/api-client";
import { mockCategories } from "@/lib/frontend/mock-data";
import { useApi } from "@/lib/frontend/hooks";
import { toDateInputValue } from "@/lib/frontend/format";
import { cn } from "@/lib/frontend/utils";
import type { ProductListItem } from "@/lib/frontend/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { ProductCard } from "@/components/product/product-card";
import { Field } from "./field";

type LaunchMode = "LIVE" | "SCHEDULED" | "DRAFT";

const MODES: { value: LaunchMode; title: string; description: string }[] = [
  { value: "LIVE", title: "Publicar ya", description: "Visible para toda la comunidad hoy mismo." },
  { value: "SCHEDULED", title: "Programar", description: "Elige la fecha de lanzamiento." },
  { value: "DRAFT", title: "Borrador", description: "Solo tú lo ves, publícalo cuando quieras." },
];

type FieldName = "name" | "tagline" | "description" | "websiteUrl" | "logoUrl" | "categoryId" | "launchDate";
type FieldErrors = Partial<Record<FieldName, string>>;

/**
 * Submit-launch form → POST /api/products.
 * Validation mirrors the backend schema (createProductSchema); server-side
 * Zod errors are mapped back onto each field as a second line of defense.
 */
export function SubmitLaunchForm() {
  const router = useRouter();
  const { data: session } = useSession();

  const { data: categories } = useApi(fetchCategories, { fallback: () => mockCategories });

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [launchDate, setLaunchDate] = useState(toDateInputValue(new Date()));
  const [mode, setMode] = useState<LaunchMode>("LIVE");

  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side pre-checks (UX only — the server re-validates everything).
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setErrors((prev) => ({ ...prev, logoUrl: "Formato no soportado. Usa PNG, JPG o WebP." }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, logoUrl: "La imagen supera el máximo de 2MB." }));
      return;
    }

    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, logoUrl: undefined }));
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      setLogoUrl(url);
    } catch (err) {
      setFilePreview(null);
      setErrors((prev) => ({
        ...prev,
        logoUrl:
          err instanceof ApiClientError ? err.message : "No pudimos subir la imagen. Intenta de nuevo.",
      }));
    } finally {
      setUploading(false);
      e.target.value = ""; // allow re-picking the same file
    }
  }

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (name.trim().length < 2) errs.name = "El nombre necesita al menos 2 caracteres.";
    if (tagline.trim().length < 4) errs.tagline = "La tagline necesita al menos 4 caracteres.";
    if (description.trim().length < 10)
      errs.description = "Cuéntanos un poco más (mínimo 10 caracteres).";
    if (websiteUrl && !/^https?:\/\//.test(websiteUrl))
      errs.websiteUrl = "Debe ser una URL completa (https://…).";
    if (logoUrl && !/^https?:\/\//.test(logoUrl) && !logoUrl.startsWith("/api/uploads/"))
      errs.logoUrl = "Debe ser una URL completa (https://…) o una imagen subida.";
    if (!categoryId) errs.categoryId = "Elige una categoría.";
    if (!launchDate) errs.launchDate = "Elige la fecha de lanzamiento.";
    return errs;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const product = await createProduct({
        name: name.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        websiteUrl: websiteUrl.trim() || null,
        logoUrl: logoUrl.trim() || null,
        categoryId,
        launchDate: new Date(`${launchDate}T12:00:00`).toISOString(),
        status: mode,
      });
      router.push(`/products/${product.slug}?just_launched=1`);
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ApiClientError) {
        const details = err.details as Record<string, string[]> | undefined;
        if (err.status === 400 && details) {
          setErrors(
            Object.fromEntries(
              Object.entries(details).map(([k, v]) => [k, v?.[0]])
            ) as FieldErrors
          );
        }
        setFormError(err.message);
      } else {
        setFormError("No pudimos publicar tu producto. Intenta de nuevo.");
      }
    }
  }

  // Live preview card fed by the current form state.
  const preview: ProductListItem = useMemo(
    () => ({
      id: "preview",
      name: name.trim() || "Tu producto",
      slug: "preview",
      tagline: tagline.trim() || "Una línea que enamore en 140 caracteres",
      logoUrl: logoUrl.trim() || filePreview,
      websiteUrl: websiteUrl.trim() || null,
      launchDate: new Date().toISOString(),
      status: mode,
      createdAt: new Date().toISOString(),
      category: categories?.find((c) => c.id === categoryId) ?? {
        id: "preview",
        name: "Categoría",
        slug: "preview",
      },
      maker: {
        id: session?.user?.id ?? "preview",
        name: session?.user?.name ?? "Tú",
        avatarUrl: session?.user?.image ?? null,
        verifiedAt: null,
      },
      _count: { upvotes: 1, comments: 0 },
    }),
    [name, tagline, logoUrl, filePreview, websiteUrl, mode, categories, categoryId, session]
  );

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <form onSubmit={onSubmit} className="min-w-0 space-y-6" noValidate>
        <Field id="p-name" label="Nombre del producto" error={errors.name}>
          <Input
            id="p-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="FocusFlow"
            maxLength={80}
            required
          />
        </Field>

        <Field
          id="p-tagline"
          label="Tagline"
          error={errors.tagline}
          hint={`Tu pitch en una línea. ${tagline.length}/140`}
        >
          <Input
            id="p-tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="El temporizador de deep work que se adapta a tu energía"
            maxLength={140}
            required
          />
        </Field>

        <Field
          id="p-description"
          label="Descripción"
          error={errors.description}
          hint={`Qué hace, para quién y qué lo hace diferente. ${description.length}/5000`}
        >
          <Textarea
            id="p-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Cuenta la historia: el problema, tu solución y qué feedback buscas de la comunidad…"
            className="min-h-[160px]"
            maxLength={5000}
            required
          />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field id="p-website" label="Sitio web" error={errors.websiteUrl} optional>
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="p-website"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://tuproducto.com"
                className="pl-9"
              />
            </div>
          </Field>

          <Field id="p-category" label="Categoría" error={errors.categoryId}>
            <Select
              id="p-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="" disabled>
                Elige una categoría…
              </option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {/* Logo: real upload (POST /api/uploads) or a public URL as fallback */}
        <Field
          id="p-logo-url"
          label="Logo"
          error={errors.logoUrl}
          optional
          hint="Sube una imagen PNG, JPG o WebP (máx. 2MB), o pega una URL pública."
        >
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border-2 border-dashed text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-60"
              aria-label="Elegir imagen de logo"
              aria-busy={uploading}
            >
              {uploading ? (
                <span className="text-[10px] font-semibold">Subiendo…</span>
              ) : filePreview || logoUrl ? (
                <img
                  src={filePreview || logoUrl.trim()}
                  alt="Vista previa del logo"
                  className="h-full w-full object-cover"
                />
              ) : (
                <>
                  <ImagePlus className="h-6 w-6" aria-hidden />
                  <span className="text-[10px] font-semibold">Subir</span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={onPickFile}
              aria-hidden
              tabIndex={-1}
            />
            <div className="flex-1">
              <Input
                id="p-logo-url"
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://…/logo.png"
              />
            </div>
          </div>
        </Field>

        {/* Launch mode */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">¿Cómo quieres lanzar?</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {MODES.map((m) => (
              <label
                key={m.value}
                className={cn(
                  "flex cursor-pointer flex-col gap-1 rounded-2xl border p-4 transition-all",
                  mode === m.value
                    ? "border-primary bg-accent shadow-soft"
                    : "hover:border-primary/40"
                )}
              >
                <input
                  type="radio"
                  name="launch-mode"
                  value={m.value}
                  checked={mode === m.value}
                  onChange={() => setMode(m.value)}
                  className="sr-only"
                />
                <span className="text-sm font-bold">{m.title}</span>
                <span className="text-xs text-muted-foreground">{m.description}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field
          id="p-date"
          label="Fecha de lanzamiento"
          error={errors.launchDate}
          hint={mode === "SCHEDULED" ? "El producto se mostrará como programado hasta esta fecha." : undefined}
        >
          <div className="relative sm:max-w-xs">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="p-date"
              type="date"
              value={launchDate}
              onChange={(e) => setLaunchDate(e.target.value)}
              className="pl-9"
              required
            />
          </div>
        </Field>

        {formError && <Alert variant="destructive">{formError}</Alert>}

        <div className="flex items-center gap-3 border-t pt-6">
          <Button type="submit" variant="gradient" size="lg" disabled={submitting}>
            <PartyPopper className="h-4 w-4" aria-hidden />
            {submitting
              ? "Publicando…"
              : mode === "LIVE"
                ? "Lanzar a la comunidad"
                : mode === "SCHEDULED"
                  ? "Programar lanzamiento"
                  : "Guardar borrador"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Podrás editarlo después desde tu perfil.
          </p>
        </div>
      </form>

      {/* Live preview */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Así se verá tu tarjeta
        </p>
        <div className="pointer-events-none select-none" aria-hidden>
          <ProductCard product={preview} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Consejo: una tagline concreta consigue más votos que una genérica. Di qué hace y para
          quién.
        </p>
      </aside>
    </div>
  );
}
