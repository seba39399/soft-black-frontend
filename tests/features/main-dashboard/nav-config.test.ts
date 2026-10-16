import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import {
  GROUP_MENU_MAP,
  canAccessRoute,
  resolveNavItems,
  resolveRedirectTarget,
} from "@/features/main-dashboard/utils/nav-config";

const knownGroup = fc.constantFrom(...Object.keys(GROUP_MENU_MAP));
const anyGroups = fc.array(fc.oneof(knownGroup, fc.string()));

describe("nav-config", () => {
  it("el orden de los grupos no cambia el menú", () => {
    fc.assert(
      fc.property(anyGroups, (groups) => {
        const reversed = [...groups].reverse();
        expect(resolveNavItems(reversed)).toEqual(resolveNavItems(groups));
      }),
    );
  });

  it("toda ruta del menú es accesible", () => {
    fc.assert(
      fc.property(anyGroups, (groups) => {
        for (const item of resolveNavItems(groups)) {
          expect(canAccessRoute(groups, item.href)).toBe(true);
        }
      }),
    );
  });

  it("el destino de redirección es accesible o es /login", () => {
    fc.assert(
      fc.property(anyGroups, (groups) => {
        const target = resolveRedirectTarget(groups);
        expect(target === "/login" || canAccessRoute(groups, target)).toBe(true);
      }),
    );
  });

  it("/radio no da acceso a /radio_10", () => {
    expect(canAccessRoute(["admin"], "/radio")).toBe(true);
    expect(canAccessRoute(["admin"], "/radio_10")).toBe(false);
  });
});
