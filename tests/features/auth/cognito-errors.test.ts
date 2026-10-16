import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { translateCognitoError } from "@/features/auth/utils/cognito-errors";

const err = (name: string) => Object.assign(new Error("texto original de AWS"), { name });

describe("translateCognitoError", () => {
  it("no revela si el usuario existe", () => {
    expect(translateCognitoError(err("UserNotFoundException"), "credentials")).toBe(
      translateCognitoError(err("NotAuthorizedException"), "credentials"),
    );
  });

  it("siempre devuelve un mensaje en texto, sin el texto original de AWS", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.constantFrom("credentials" as const, "newPassword" as const),
        (name, phase) => {
          const message = translateCognitoError(err(name), phase);
          expect(typeof message).toBe("string");
          expect(message).not.toContain("texto original de AWS");
        },
      ),
    );
  });
});
