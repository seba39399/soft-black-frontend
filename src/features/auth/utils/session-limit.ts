/**
 * Duración máxima de la sesión (docs/03 §9).
 *
 * La sesión dura como máximo `NEXT_PUBLIC_SESSION_MAX_MINUTES` minutos
 * (60 por defecto) contados desde el **inicio de sesión**, no desde la
 * última actividad. El inicio sale del claim `auth_time` del access token:
 * Cognito lo fija al autenticar y lo conserva al renovar el token, así que
 * no hace falta guardar nada en el navegador.
 *
 * Funciones puras: las usan el cliente (layout y login) y el servidor
 * (`proxy.ts`).
 */

/** Minutos por defecto si la variable no está definida. */
export const DEFAULT_SESSION_MAX_MINUTES = 60;

/** Rango permitido: de 5 minutos a 24 horas. */
export const MIN_SESSION_MAX_MINUTES = 5;
export const MAX_SESSION_MAX_MINUTES = 1440;

/** Nombre exacto de la variable (para mensajes de error). */
export const SESSION_MAX_MINUTES_KEY = "NEXT_PUBLIC_SESSION_MAX_MINUTES";

/** Query param con el que se llega a /login cuando la sesión venció. */
export const SESSION_EXPIRED_PARAM = "expired";

/** Ruta de login tras vencer la sesión. */
export const SESSION_EXPIRED_LOGIN_PATH = `/login?${SESSION_EXPIRED_PARAM}=1`;

/** Mensaje que ve el usuario en el login. */
export const SESSION_EXPIRED_MESSAGE =
  "Tu sesión expiró por tiempo. Inicia sesión de nuevo.";

/**
 * Convierte el valor crudo de la variable en minutos.
 * Vacía o ausente → 60. Un valor inválido lanza un error en español con el
 * nombre de la variable (igual que `env.ts`): mejor fallar al arrancar que
 * dejar sesiones sin límite por un typo.
 */
export function parseSessionMaxMinutes(raw: string | undefined | null): number {
  if (raw == null || raw.trim() === "") return DEFAULT_SESSION_MAX_MINUTES;

  const value = raw.trim();
  const minutes = /^\d+$/.test(value) ? Number(value) : Number.NaN;

  if (
    !Number.isSafeInteger(minutes) ||
    minutes < MIN_SESSION_MAX_MINUTES ||
    minutes > MAX_SESSION_MAX_MINUTES
  ) {
    throw new Error(
      `${SESSION_MAX_MINUTES_KEY} debe ser un número entero de minutos entre ` +
        `${MIN_SESSION_MAX_MINUTES} y ${MAX_SESSION_MAX_MINUTES} (recibido: "${value}").`,
    );
  }
  return minutes;
}

/**
 * Lee la variable. Lectura LITERAL: Next solo inyecta en el navegador las
 * `NEXT_PUBLIC_*` escritas como `process.env.NEXT_PUBLIC_X`.
 */
export function readSessionMaxMinutes(): number {
  return parseSessionMaxMinutes(process.env.NEXT_PUBLIC_SESSION_MAX_MINUTES);
}

/**
 * Momento (epoch ms) en que vence la sesión, o `null` si `authTime` no es un
 * número válido de segundos.
 */
export function sessionDeadlineMs(authTime: unknown, maxMinutes: number): number | null {
  if (typeof authTime !== "number" || !Number.isFinite(authTime) || authTime <= 0) {
    return null;
  }
  return authTime * 1000 + maxMinutes * 60_000;
}

/**
 * `true` si la sesión ya venció. Sin `auth_time` válido se considera vencida
 * (falla cerrada: se vuelve a iniciar sesión).
 */
export function isSessionExpired(
  authTime: unknown,
  maxMinutes: number,
  nowMs: number,
): boolean {
  const deadline = sessionDeadlineMs(authTime, maxMinutes);
  return deadline === null || nowMs >= deadline;
}
