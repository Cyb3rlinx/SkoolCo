import { getMyLinks, submitLink, postEvent, type LinkType } from "./api";
import { isCommunityPostUrl, cleanTitle } from "./community";
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

function showLogin(base: string) {
  const guard = $("send-guard");
  guard.hidden = false;
  $("guard-msg").textContent = "Necesitas iniciar sesión en LaunchPad.";
  const btn = $<HTMLButtonElement>("open-site");
  btn.hidden = false;
  btn.onclick = () => chrome.tabs.create({ url: base });
}

async function initSend(base: string) {
  const guard = $("send-guard");
  const guardMsg = $("guard-msg");
  const form = $<HTMLFormElement>("send-form");
  const tab = await activeTab();

  if (!tab || !isCommunityPostUrl(tab.url)) {
    guard.hidden = false;
    guardMsg.textContent =
      "Abre un post público de tu comunidad (Skool, Discord, YouTube, X, Facebook, LinkedIn, Instagram, Telegram o Circle) para enviarlo como logro.";
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
