import { defineConfig } from "vitest/config";

// Config propia: sin este archivo, Vitest sube hasta la raíz del repo y
// carga el vitest.config.ts del backend (que aquí no aplica y rompe en CI).
export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
