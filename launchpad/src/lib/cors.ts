/** True only if `origin` is explicitly listed in the comma-separated env value. */
export function isAllowedOrigin(origin: string | null, envValue: string | undefined): boolean {
  if (!origin || !envValue) return false;
  return envValue
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(origin);
}
