/**
 * Setup global de tests.
 *
 * - Registra los matchers de @testing-library/jest-dom.
 * - Configura fast-check con un mínimo de 100 iteraciones (numRuns) por test de
 *   propiedad, conforme a la Testing Strategy del diseño.
 * - Limpia el DOM de React Testing Library tras cada test.
 */
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import * as fc from "fast-check";

// Mínimo 100 iteraciones por propiedad (Testing Strategy del diseño).
fc.configureGlobal({ numRuns: 100 });

afterEach(() => {
  cleanup();
});
