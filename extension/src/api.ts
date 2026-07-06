export type LinkType = "logro" | "milestone" | "announcement" | "other";

export interface CommunityLink {
  id: string;
  title: string;
  url: string;
  type: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  createdAt: string;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      kind: "unauthorized" | "duplicate" | "rate_limited" | "invalid" | "network" | "server";
      message: string;
    };

async function request<T>(base: string, path: string, init?: RequestInit): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(base.replace(/\/+$/, "") + path, {
      ...init,
      credentials: "include",
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    return {
      ok: false,
      kind: "network",
      message: "No se pudo conectar con LaunchPad. ¿El servidor está corriendo?",
    };
  }
  const body = (await res.json().catch(() => null)) as
    | { data?: T; error?: { message?: string } }
    | null;
  if (res.ok) return { ok: true, data: body?.data as T };
  const kind =
    res.status === 401
      ? "unauthorized"
      : res.status === 409
        ? "duplicate"
        : res.status === 429
          ? "rate_limited"
          : res.status === 400
            ? "invalid"
            : "server";
  return { ok: false, kind, message: body?.error?.message ?? `Error ${res.status}` };
}

export const getMyLinks = (base: string) =>
  request<CommunityLink[]>(base, "/api/community-links?mine=1");

export const submitLink = (base: string, input: { title: string; url: string; type: LinkType }) =>
  request<CommunityLink>(base, "/api/community-links", {
    method: "POST",
    body: JSON.stringify(input),
  });

/** Telemetría first-party, fire-and-forget: nunca bloquea ni muestra errores. */
export async function postEvent(
  base: string,
  eventType: "extension_opened" | "link_submitted" | "link_viewed"
): Promise<void> {
  try {
    await fetch(base.replace(/\/+$/, "") + "/api/extension/events", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventType }),
    });
  } catch {
    /* silencio deliberado */
  }
}
