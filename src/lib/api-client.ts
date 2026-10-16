/**
 * Cliente HTTP hacia la API externa (docs/07 §3).
 *
 * - Adjunta `Authorization: Bearer <accessToken>` (nunca el id token).
 * - Timeout de 10 s para obtener la sesión y de 15 s para la request.
 * - Revisa `response.ok`: los errores HTTP se lanzan como `ApiRequestError`
 *   con `status`, `code` y un mensaje en español listo para mostrar.
 *
 * Toda llamada de datos pasa por `apiFetch` (prohibido `fetch` suelto).
 */

import { fetchAuthSession } from "aws-amplify/auth";
import { readRequiredEnv } from "@/features/auth/utils/env";
import { withTimeout } from "@/lib/with-timeout";
import type { ApiError } from "@/types/api";

const SESSION_TIMEOUT_MS = 10_000;
const REQUEST_TIMEOUT_MS = 15_000;

/** Error de una llamada a la API. `status` 0 = sin respuesta (red/timeout). */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { error?: unknown }).error === "string"
  );
}

/**
 * Headers de autenticación. Sin sesión → `ApiRequestError` 401 (quien llama
 * muestra el mensaje). Fallo o timeout al obtener la sesión → status 0.
 */
export async function authHeaders(): Promise<Record<string, string>> {
  let session;
  try {
    session = await withTimeout(fetchAuthSession(), SESSION_TIMEOUT_MS);
  } catch {
    throw new ApiRequestError(
      "No se pudo obtener la sesión. Intenta de nuevo.",
      0,
    );
  }

  const token = session.tokens?.accessToken?.toString();
  if (!token) {
    throw new ApiRequestError(
      "No hay sesión activa. Inicia sesión de nuevo.",
      401,
    );
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/**
 * GET/POST/… tipado contra la API. Devuelve el JSON como `T` (o `undefined`
 * con 204). Cualquier respuesta no-2xx lanza `ApiRequestError`.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const { apiBaseUrl } = readRequiredEnv();

  const headers = new Headers(init?.headers);
  for (const [name, value] of Object.entries(await authHeaders())) {
    headers.set(name, value);
  }

  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeout])
    : timeout;

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers,
      signal,
    });
  } catch (err) {
    // Cancelación pedida por quien llama: se propaga tal cual.
    if (init?.signal?.aborted) throw err;
    throw new ApiRequestError(
      "No se pudo conectar con el servidor. Intenta de nuevo.",
      0,
    );
  }

  if (response.ok) {
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  if (response.status === 401) {
    throw new ApiRequestError(
      "Tu sesión expiró. Inicia sesión de nuevo.",
      401,
    );
  }
  if (response.status === 403) {
    throw new ApiRequestError(
      "No tienes permiso para ver esta información.",
      403,
    );
  }

  const body: unknown = await response.json().catch(() => null);
  if (isApiError(body)) {
    throw new ApiRequestError(body.error, response.status, body.code);
  }
  throw new ApiRequestError(
    `Ocurrió un error al consultar los datos (código ${response.status}).`,
    response.status,
  );
}
