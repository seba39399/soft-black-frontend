import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({
    tokens: { accessToken: { toString: () => "token-de-prueba" } },
  })),
}));

import { ApiRequestError, apiFetch } from "@/lib/api-client";

function mockFetch(status: number, body?: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(body === undefined ? null : JSON.stringify(body), { status }),
    ),
  );
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_COGNITO_USER_POOL_ID", "us-east-1_Test");
  vi.stubEnv("NEXT_PUBLIC_COGNITO_CLIENT_ID", "client");
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.test");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("apiFetch", () => {
  it("envía el Bearer y devuelve el JSON en 2xx", async () => {
    mockFetch(200, { ok: true });
    await expect(apiFetch("/v1/x")).resolves.toEqual({ ok: true });

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://api.test/v1/x");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer token-de-prueba",
    );
  });

  it("devuelve undefined en 204", async () => {
    mockFetch(204);
    await expect(apiFetch("/v1/x")).resolves.toBeUndefined();
  });

  it("401 → ApiRequestError con status 401", async () => {
    mockFetch(401, { error: "expired" });
    await expect(apiFetch("/v1/x")).rejects.toMatchObject({
      name: "ApiRequestError",
      status: 401,
      message: "Tu sesión expiró. Inicia sesión de nuevo.",
    });
  });

  it("usa el mensaje del backend si viene en formato ApiError", async () => {
    mockFetch(409, { error: "El registro cambió.", code: "CONFLICT" });
    await expect(apiFetch("/v1/x")).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
      message: "El registro cambió.",
    });
  });

  it("error de red → status 0", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network"); }));
    const err = await apiFetch("/v1/x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect((err as ApiRequestError).status).toBe(0);
  });
});
