import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

/**
 * Configuración de Vitest para la plantilla.
 *
 * - Entorno jsdom para los tests de componentes (React Testing Library).
 * - `setupFiles` registra los matchers de jest-dom y la config global de
 *   fast-check (mínimo 100 iteraciones por test de propiedad, según el diseño).
 * - Alias `@/*` -> ./src/* alineado con tsconfig.json.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
