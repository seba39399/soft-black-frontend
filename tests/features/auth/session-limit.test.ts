import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  DEFAULT_SESSION_MAX_MINUTES,
  isSessionExpired,
  parseSessionMaxMinutes,
  sessionDeadlineMs,
} from "@/features/auth/utils/session-limit";

describe("parseSessionMaxMinutes", () => {
  it("vacía o ausente usa 60 minutos", () => {
    expect(parseSessionMaxMinutes(undefined)).toBe(DEFAULT_SESSION_MAX_MINUTES);
    expect(parseSessionMaxMinutes("")).toBe(60);
    expect(parseSessionMaxMinutes("   ")).toBe(60);
  });

  it("acepta enteros entre 5 y 1440", () => {
    expect(parseSessionMaxMinutes("5")).toBe(5);
    expect(parseSessionMaxMinutes(" 480 ")).toBe(480);
    expect(parseSessionMaxMinutes("1440")).toBe(1440);
  });

  it.each(["0", "4", "1441", "-10", "1.5", "60m", "abc", "1e3"])(
    'rechaza "%s" con un error que nombra la variable',
    (raw) => {
      expect(() => parseSessionMaxMinutes(raw)).toThrow("NEXT_PUBLIC_SESSION_MAX_MINUTES");
    },
  );
});

describe("isSessionExpired", () => {
  const minutes = fc.integer({ min: 5, max: 1440 });
  const authTime = fc.integer({ min: 1_600_000_000, max: 2_000_000_000 });

  it("vence exactamente al cumplir los minutos desde el login", () => {
    fc.assert(
      fc.property(authTime, minutes, fc.integer({ min: -1_000_000, max: 1_000_000 }), (t, m, offset) => {
        const deadline = t * 1000 + m * 60_000;
        expect(sessionDeadlineMs(t, m)).toBe(deadline);
        expect(isSessionExpired(t, m, deadline + offset)).toBe(offset >= 0);
      }),
    );
  });

  it("sin auth_time válido la sesión se considera vencida", () => {
    for (const bad of [undefined, null, "1700000000", Number.NaN, 0, -5]) {
      expect(isSessionExpired(bad, 60, Date.now())).toBe(true);
      expect(sessionDeadlineMs(bad, 60)).toBeNull();
    }
  });
});
