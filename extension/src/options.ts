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
