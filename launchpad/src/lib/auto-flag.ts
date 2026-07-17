const URL_SHORTENERS = ["bit.ly", "tinyurl.com", "goo.gl", "t.co", "is.gd", "ow.ly"];

const SCAM_PHRASES = [
  "gana dinero rapido",
  "gana dinero rápido",
  "haz clic aqui",
  "haz clic aquí",
  "click aqui",
  "click aquí",
  "reclama tu premio",
  "trabaja desde casa",
  "dinero facil",
  "dinero fácil",
];

/**
 * Detección heurística básica de contenido sospechoso — reduce carga de
 * moderación manual marcando lo obvio automáticamente. No reemplaza el
 * juicio humano: falsos negativos son aceptables, el objetivo es atrapar
 * spam evidente, no ser exhaustivo.
 */
export function detectSuspiciousContent(text: string): string | null {
  const lower = text.toLowerCase();

  const shortener = URL_SHORTENERS.find((s) => lower.includes(s));
  if (shortener) return `Contiene un enlace acortado (${shortener})`;

  const phrase = SCAM_PHRASES.find((p) => lower.includes(p));
  if (phrase) return `Contiene una frase típica de estafa ("${phrase}")`;

  const letters = text.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, "");
  const upperRatio = letters.length > 0 ? [...letters].filter((c) => c === c.toUpperCase() && c !== c.toLowerCase()).length / letters.length : 0;
  const exclamations = (text.match(/!/g) ?? []).length;
  if (letters.length >= 15 && upperRatio > 0.7 && exclamations >= 2) {
    return "Exceso de mayúsculas y signos de exclamación (patrón de spam)";
  }

  return null;
}
