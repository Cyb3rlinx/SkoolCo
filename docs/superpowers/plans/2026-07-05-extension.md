# Extensión "Logros" (v1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extensión Chrome MV3 en `extension/` para enviar posts de Skool como logros a LaunchPad y ver el estado de los envíos.

**Architecture:** TypeScript + esbuild sin framework. Popup con 2 pestañas (Enviar / Mis links), options page para la URL del backend, cliente API tipado con mapeo de errores, lógica pura de detección de posts testeada con Vitest. Auth = cookie de sesión NextAuth (`credentials: "include"` + host_permissions).

**Tech Stack:** TypeScript estricto, esbuild, Vitest, @types/chrome, Chrome MV3.

## Global Constraints

- Copy visible al usuario: español neutro (sin voseo).
- Permisos mínimos: `activeTab`, `storage`, `tabs`; `host_permissions` solo `http://localhost:3000/*`; el resto vía `optional_host_permissions` a pedido.
- Nunca leer contenido de página — solo URL y título de la pestaña activa.
- Los eventos a `/api/extension/events` son fire-and-forget: jamás bloquean ni muestran error.
- Endpoints permitidos por CORS del backend: `/api/community-links*` y `/api/extension/*` — no usar otros.

---

### Task 1: Scaffold del proyecto

**Files:**
- Create: `extension/package.json`, `extension/tsconfig.json`, `extension/build.mjs`, `extension/manifest.json`, `extension/.gitignore`

**Interfaces:**
- Produces: `npm run build|test|typecheck` dentro de `extension/`; `dist/` cargable en Chrome.

- [ ] **Step 1: `extension/package.json`**

```json
{
  "name": "launchpad-extension",
  "version": "0.1.0",
  "private": true,
  "description": "Extensión Chrome para enviar logros de Skool a LaunchPad",
  "scripts": {
    "build": "node build.mjs",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.280",
    "esbuild": "^0.24.0",
    "typescript": "^5.5.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: `extension/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "types": ["chrome"],
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: `extension/build.mjs`**

```js
import { build } from "esbuild";
import { cpSync, mkdirSync } from "node:fs";

mkdirSync("dist", { recursive: true });
await build({
  entryPoints: ["src/popup.ts", "src/options.ts"],
  bundle: true,
  outdir: "dist",
  format: "iife",
  target: "chrome120",
});
for (const f of ["src/popup.html", "src/options.html", "src/popup.css", "manifest.json"]) {
  cpSync(f, `dist/${f.split("/").pop()}`);
}
console.log("dist/ listo — carga esa carpeta como extensión descomprimida");
```

- [ ] **Step 4: `extension/manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "LaunchPad — Logros",
  "version": "0.1.0",
  "description": "Envía posts públicos de Skool como logros a LaunchPad, con tu consentimiento y un clic.",
  "action": { "default_popup": "popup.html", "default_title": "LaunchPad Logros" },
  "options_page": "options.html",
  "permissions": ["activeTab", "storage", "tabs"],
  "host_permissions": ["http://localhost:3000/*"],
  "optional_host_permissions": ["https://*/*", "http://*/*"]
}
```

- [ ] **Step 5: `extension/.gitignore`** → `node_modules/`, `dist/`

- [ ] **Step 6: `npm install` dentro de `extension/` y commit**

```bash
cd extension && npm install
git add extension/package.json extension/package-lock.json extension/tsconfig.json extension/build.mjs extension/manifest.json extension/.gitignore
git commit -m "feat(extension): scaffold MV3 + esbuild + vitest"
```

---

### Task 2: Lógica pura de Skool (TDD)

**Files:**
- Create: `extension/src/skool.ts`
- Test: `extension/src/skool.test.ts`

**Interfaces:**
- Produces: `isSkoolPostUrl(url: string): boolean`, `cleanTitle(raw: string): string` — consumidas por popup.ts.

- [ ] **Step 1: Test que falla** (`extension/src/skool.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { isSkoolPostUrl, cleanTitle } from "./skool";

describe("isSkoolPostUrl", () => {
  it("acepta posts https de skool.com", () => {
    expect(isSkoolPostUrl("https://www.skool.com/mi-comunidad/gran-logro-123")).toBe(true);
    expect(isSkoolPostUrl("https://skool.com/otra/post-x")).toBe(true);
  });
  it("rechaza raíz de comunidad, http, otros dominios y rutas reservadas", () => {
    expect(isSkoolPostUrl("https://www.skool.com/mi-comunidad")).toBe(false);
    expect(isSkoolPostUrl("http://www.skool.com/c/post")).toBe(false);
    expect(isSkoolPostUrl("https://evil.com/skool.com/post")).toBe(false);
    expect(isSkoolPostUrl("https://www.skool.com/signup/x")).toBe(false);
    expect(isSkoolPostUrl("no-es-url")).toBe(false);
  });
});

describe("cleanTitle", () => {
  it("quita el sufijo de Skool y recorta espacios", () => {
    expect(cleanTitle("Mi gran logro | Skool")).toBe("Mi gran logro");
    expect(cleanTitle("  Hito - Skool ")).toBe("Hito");
  });
  it("acota a 140 caracteres", () => {
    expect(cleanTitle("x".repeat(200)).length).toBeLessThanOrEqual(140);
  });
});
```

- [ ] **Step 2: `npm test` → FAIL** (módulo no existe)

- [ ] **Step 3: Implementación** (`extension/src/skool.ts`)

```ts
const RESERVED = new Set(["login", "signup", "pricing", "about", "legal", "support", "discovery"]);

/** Heurística de UX: ¿la URL parece un post público de Skool? (el backend revalida) */
export function isSkoolPostUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const host = u.hostname;
    if (host !== "skool.com" && !host.endsWith(".skool.com")) return false;
    const segs = u.pathname.split("/").filter(Boolean);
    if (segs.length < 2) return false;
    return !RESERVED.has(segs[0].toLowerCase());
  } catch {
    return false;
  }
}

/** Limpia el título de pestaña de Skool para usarlo como título del logro. */
export function cleanTitle(raw: string): string {
  let t = raw.replace(/\s*[|\-–—]\s*Skool\s*$/i, "").trim();
  if (t.length > 140) t = t.slice(0, 137).trimEnd() + "…";
  return t;
}
```

- [ ] **Step 4: `npm test` → PASS · Step 5: commit** `feat(extension): detección de posts de Skool y limpieza de títulos`

---

### Task 3: Cliente API tipado (TDD)

**Files:**
- Create: `extension/src/api.ts`
- Test: `extension/src/api.test.ts`

**Interfaces:**
- Produces: `getMyLinks(base)`, `submitLink(base, input)`, `postEvent(base, type)`, tipo `ApiResult<T>` — consumidos por popup.ts.

- [ ] **Step 1: Test que falla** (`extension/src/api.test.ts`)

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { submitLink, getMyLinks } from "./api";

const BASE = "http://localhost:3000";
afterEach(() => vi.unstubAllGlobals());

function stubFetch(status: number, body: unknown) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }));
}

describe("api error mapping", () => {
  it("201 → ok con data", async () => {
    stubFetch(201, { data: { id: "1", status: "PENDING" } });
    const r = await submitLink(BASE, { title: "T", url: "https://www.skool.com/c/p", type: "logro" });
    expect(r.ok).toBe(true);
  });
  it("401 → unauthorized", async () => {
    stubFetch(401, { error: { message: "Authentication required" } });
    const r = await getMyLinks(BASE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe("unauthorized");
  });
  it("409 → duplicate, 429 → rate_limited", async () => {
    stubFetch(409, { error: { message: "dup" } });
    const dup = await submitLink(BASE, { title: "T", url: "https://www.skool.com/c/p", type: "logro" });
    if (!dup.ok) expect(dup.kind).toBe("duplicate");
    stubFetch(429, { error: { message: "slow" } });
    const rl = await submitLink(BASE, { title: "T", url: "https://www.skool.com/c/p", type: "logro" });
    if (!rl.ok) expect(rl.kind).toBe("rate_limited");
  });
  it("red caída → network", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
    const r = await getMyLinks(BASE);
    if (!r.ok) expect(r.kind).toBe("network");
  });
});
```

- [ ] **Step 2: FAIL · Step 3: Implementación** (`extension/src/api.ts`)

```ts
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
  | { ok: false; kind: "unauthorized" | "duplicate" | "rate_limited" | "invalid" | "network" | "server"; message: string };

async function request<T>(base: string, path: string, init?: RequestInit): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(base.replace(/\/+$/, "") + path, {
      ...init,
      credentials: "include",
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    return { ok: false, kind: "network", message: "No se pudo conectar con LaunchPad. ¿El servidor está corriendo?" };
  }
  const body = (await res.json().catch(() => null)) as { data?: T; error?: { message?: string } } | null;
  if (res.ok) return { ok: true, data: body?.data as T };
  const kind =
    res.status === 401 ? "unauthorized"
    : res.status === 409 ? "duplicate"
    : res.status === 429 ? "rate_limited"
    : res.status === 400 ? "invalid"
    : "server";
  return { ok: false, kind, message: body?.error?.message ?? `Error ${res.status}` };
}

export const getMyLinks = (base: string) =>
  request<CommunityLink[]>(base, "/api/community-links?mine=1");

export const submitLink = (base: string, input: { title: string; url: string; type: LinkType }) =>
  request<CommunityLink>(base, "/api/community-links", { method: "POST", body: JSON.stringify(input) });

/** Telemetría first-party, fire-and-forget: nunca bloquea ni muestra errores. */
export async function postEvent(base: string, eventType: "extension_opened" | "link_submitted" | "link_viewed"): Promise<void> {
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
```

- [ ] **Step 4: PASS · Step 5: commit** `feat(extension): cliente API tipado con mapeo de errores`

---

### Task 4: Options page (URL del backend)

**Files:**
- Create: `extension/src/options.html`, `extension/src/options.ts`, `extension/src/storage.ts`

**Interfaces:**
- Produces: `getBaseUrl(): Promise<string>` (storage.ts) — consumida por popup.ts y options.ts.

- [ ] **Step 1: `extension/src/storage.ts`**

```ts
const DEFAULT_BASE_URL = "http://localhost:3000";

export async function getBaseUrl(): Promise<string> {
  const { baseUrl } = await chrome.storage.sync.get({ baseUrl: DEFAULT_BASE_URL });
  return (baseUrl as string).replace(/\/+$/, "");
}

export async function setBaseUrl(url: string): Promise<void> {
  await chrome.storage.sync.set({ baseUrl: url.replace(/\/+$/, "") });
}
```

- [ ] **Step 2: `extension/src/options.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /><title>LaunchPad Logros — Opciones</title>
<style>body{font:14px system-ui;max-width:480px;margin:2rem auto;padding:0 1rem}input{width:100%;padding:.5rem;margin:.5rem 0}button{padding:.5rem 1rem}#msg{margin-top:.5rem}</style>
</head>
<body>
  <h1>Opciones</h1>
  <label for="baseUrl">URL del backend de LaunchPad</label>
  <input id="baseUrl" type="url" placeholder="http://localhost:3000" />
  <button id="save">Guardar</button>
  <p id="msg" role="status"></p>
  <script src="options.js"></script>
</body>
</html>
```

- [ ] **Step 3: `extension/src/options.ts`**

```ts
import { getBaseUrl, setBaseUrl } from "./storage";

const input = document.getElementById("baseUrl") as HTMLInputElement;
const msg = document.getElementById("msg") as HTMLParagraphElement;

getBaseUrl().then((url) => (input.value = url));

document.getElementById("save")!.addEventListener("click", async () => {
  let origin: string;
  try {
    origin = new URL(input.value).origin;
  } catch {
    msg.textContent = "URL inválida.";
    return;
  }
  // Para URLs distintas al localhost por defecto, Chrome exige permiso explícito.
  const granted = await chrome.permissions.request({ origins: [origin + "/*"] });
  if (!granted) {
    msg.textContent = "Permiso denegado para ese origen.";
    return;
  }
  await setBaseUrl(origin);
  msg.textContent = "Guardado ✓";
});
```

- [ ] **Step 4: typecheck + commit** `feat(extension): options page con URL de backend configurable`

---

### Task 5: Popup (Enviar + Mis links)

**Files:**
- Create: `extension/src/popup.html`, `extension/src/popup.css`, `extension/src/popup.ts`

- [ ] **Step 1: `extension/src/popup.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /><link rel="stylesheet" href="popup.css" /></head>
<body>
  <header>
    <strong>LaunchPad — Logros</strong>
    <nav><button id="tab-send" class="tab active">Enviar</button><button id="tab-links" class="tab">Mis links</button></nav>
  </header>

  <section id="view-send">
    <div id="send-guard" hidden><p id="guard-msg"></p><button id="open-site" hidden>Abrir LaunchPad</button></div>
    <form id="send-form" hidden>
      <p class="url" id="post-url"></p>
      <label>Título <input id="title" maxlength="140" required minlength="2" /></label>
      <label>Tipo
        <select id="type">
          <option value="logro">Logro</option>
          <option value="milestone">Hito</option>
          <option value="announcement">Anuncio</option>
          <option value="other">Otro</option>
        </select>
      </label>
      <button type="submit" id="submit">Enviar como logro</button>
    </form>
    <p id="send-msg" role="status"></p>
  </section>

  <section id="view-links" hidden>
    <ul id="links-list"></ul>
    <p id="links-msg" role="status"></p>
  </section>

  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: `extension/src/popup.css`** — estilos mínimos (360px de ancho, chips de estado con clases `.PENDING/.VERIFIED/.REJECTED`).

```css
body { font: 13px/1.4 system-ui; width: 360px; margin: 0; }
header { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-bottom: 1px solid #e3e3e3; }
.tab { border: none; background: none; padding: 6px 10px; cursor: pointer; border-radius: 6px; }
.tab.active { background: #111; color: #fff; }
section { padding: 12px; }
label { display: block; margin: 8px 0; }
input, select { width: 100%; padding: 6px; margin-top: 2px; box-sizing: border-box; }
button[type="submit"], #open-site { width: 100%; padding: 8px; margin-top: 8px; background: #111; color: #fff; border: none; border-radius: 6px; cursor: pointer; }
button:disabled { opacity: .5; }
.url { color: #666; word-break: break-all; font-size: 11px; }
ul { list-style: none; padding: 0; margin: 0; }
li { padding: 8px 0; border-bottom: 1px solid #eee; }
.chip { font-size: 10px; padding: 2px 8px; border-radius: 10px; margin-left: 6px; }
.chip.PENDING { background: #fff3cd; } .chip.VERIFIED { background: #d4edda; } .chip.REJECTED { background: #f8d7da; }
#send-msg, #links-msg, #guard-msg { color: #444; }
```

- [ ] **Step 3: `extension/src/popup.ts`**

```ts
import { getMyLinks, submitLink, postEvent, type LinkType } from "./api";
import { isSkoolPostUrl, cleanTitle } from "./skool";
import { getBaseUrl } from "./storage";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

async function activeTab(): Promise<{ url: string; title: string } | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url ? { url: tab.url, title: tab.title ?? "" } : null;
}

function switchTab(which: "send" | "links") {
  $("view-send").hidden = which !== "send";
  $("view-links").hidden = which !== "links";
  $("tab-send").classList.toggle("active", which === "send");
  $("tab-links").classList.toggle("active", which === "links");
}

async function initSend(base: string) {
  const guard = $("send-guard");
  const guardMsg = $("guard-msg");
  const form = $<HTMLFormElement>("send-form");
  const tab = await activeTab();

  if (!tab || !isSkoolPostUrl(tab.url)) {
    guard.hidden = false;
    guardMsg.textContent = "Abre un post público de Skool para enviarlo como logro.";
    return;
  }

  form.hidden = false;
  $("post-url").textContent = tab.url;
  $<HTMLInputElement>("title").value = cleanTitle(tab.title);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $<HTMLButtonElement>("submit");
    btn.disabled = true;
    $("send-msg").textContent = "Enviando…";
    const result = await submitLink(base, {
      title: $<HTMLInputElement>("title").value.trim(),
      url: tab.url,
      type: $<HTMLSelectElement>("type").value as LinkType,
    });
    if (result.ok) {
      $("send-msg").textContent = "✅ Enviado. Queda pendiente de verificación por un moderador.";
      void postEvent(base, "link_submitted");
    } else {
      const map: Record<string, string> = {
        unauthorized: "Inicia sesión en LaunchPad y vuelve a intentar.",
        duplicate: "Ya enviaste este link antes.",
        rate_limited: "Demasiados envíos por ahora. Intenta más tarde.",
        invalid: result.message,
        network: result.message,
        server: "Error del servidor. Intenta más tarde.",
      };
      $("send-msg").textContent = "⚠️ " + map[result.kind];
      btn.disabled = false;
      if (result.kind === "unauthorized") showLogin(base);
    }
  });
}

function showLogin(base: string) {
  const guard = $("send-guard");
  guard.hidden = false;
  $("guard-msg").textContent = "Necesitas iniciar sesión en LaunchPad.";
  const btn = $<HTMLButtonElement>("open-site");
  btn.hidden = false;
  btn.onclick = () => chrome.tabs.create({ url: base });
}

async function initLinks(base: string) {
  const list = $("links-list");
  const msg = $("links-msg");
  msg.textContent = "Cargando…";
  const result = await getMyLinks(base);
  if (!result.ok) {
    msg.textContent =
      result.kind === "unauthorized"
        ? "Inicia sesión en LaunchPad para ver tus envíos."
        : "⚠️ " + result.message;
    if (result.kind === "unauthorized") showLogin(base);
    return;
  }
  msg.textContent = result.data.length ? "" : "Aún no enviaste ningún logro.";
  const STATUS_LABEL = { PENDING: "Pendiente", VERIFIED: "Verificado", REJECTED: "Rechazado" } as const;
  for (const link of result.data) {
    const li = document.createElement("li");
    const title = document.createElement("span");
    title.textContent = link.title;
    const chip = document.createElement("span");
    chip.className = `chip ${link.status}`;
    chip.textContent = STATUS_LABEL[link.status];
    li.append(title, chip);
    list.append(li);
  }
}

(async function main() {
  const base = await getBaseUrl();
  void postEvent(base, "extension_opened");
  $("tab-send").addEventListener("click", () => switchTab("send"));
  $("tab-links").addEventListener("click", () => switchTab("links"));
  await initSend(base);
  await initLinks(base);
})();
```

- [ ] **Step 4: `npm run typecheck && npm test && npm run build`** → dist/ generado sin errores.
- [ ] **Step 5: commit** `feat(extension): popup Enviar + Mis links`

---

### Task 6: README de la extensión + CI

**Files:**
- Create: `extension/README.md`
- Modify: `.github/workflows/ci.yml` (job `extension`)

- [ ] **Step 1: `extension/README.md`** — pasos: `npm install && npm run build`, cargar `extension/dist` como descomprimida en `chrome://extensions` (modo desarrollador), copiar el ID, ponerlo en el `.env` del backend (`ALLOWED_EXTENSION_ORIGINS=chrome-extension://<id>`), reiniciar backend, iniciar sesión en el sitio y usar el popup. Checklist de smoke manual.

- [ ] **Step 2: job de CI**

```yaml
  extension:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: extension } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22", cache: "npm", cache-dependency-path: extension/package-lock.json }
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

- [ ] **Step 3: commit** `feat(extension): README de instalación + job de CI`

---

## Self-Review

- **Cobertura del spec:** flujo Enviar ✓ (T2/T3/T5), Mis links ✓ (T5), sonda de sesión vía `?mine=1` ✓ (T5 initLinks/showLogin), options + storage ✓ (T4), permisos mínimos ✓ (T1 manifest), eventos fire-and-forget ✓ (T3/T5), tests de lógica pura ✓ (T2/T3), carga local ✓ (T6 README), copy español neutro ✓.
- **Consistencia de tipos:** `ApiResult`, `LinkType`, `getBaseUrl` coinciden entre tareas productoras y consumidoras.
- **Sin placeholders:** todo el código está inline.
