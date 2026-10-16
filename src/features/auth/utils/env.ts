/**
 * Validación de arranque compartida de variables de entorno.
 *
 * Reutilizada por `ConfigureAmplify`, `amplify-server` y `api-client`.
 * Regla única y compartida: una variable es inválida cuando está ausente,
 * vacía o contiene solo espacios en blanco.
 *
 * Al fallar, se lanza un `Error` en español que enumera por nombre TODAS
 * las variables faltantes/vacías (no solo la primera).
 */

export interface RequiredEnv {
  userPoolId: string;
  clientId: string;
  apiBaseUrl: string;
}

/** Nombres exactos de las variables de entorno requeridas. */
export const ENV_KEYS = {
  userPoolId: "NEXT_PUBLIC_COGNITO_USER_POOL_ID",
  clientId: "NEXT_PUBLIC_COGNITO_CLIENT_ID",
  apiBaseUrl: "NEXT_PUBLIC_API_BASE_URL",
} as const;

/** Una variable es "blank" si es null/undefined o solo espacios. */
export function isBlank(v: string | undefined | null): boolean {
  return v == null || v.trim() === "";
}

/**
 * Lectura LITERAL de las variables. Next solo inyecta en el bundle del
 * navegador las `NEXT_PUBLIC_*` escritas como `process.env.NEXT_PUBLIC_X`;
 * un acceso dinámico por clave queda `undefined` en el cliente.
 */
function readRawEnv(): Record<keyof RequiredEnv, string | undefined> {
  return {
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
    clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  };
}

/**
 * Construye el mensaje de error en español enumerando los nombres de las
 * variables inválidas.
 */
function missingEnvError(names: readonly string[]): Error {
  return new Error(
    `Faltan variables de entorno requeridas: ${names.join(
      ", ",
    )}. Defínelas en .env.local.`,
  );
}

/**
 * Lee y valida las tres variables de entorno requeridas. Trata cadena vacía
 * o solo espacios como ausente. Si falta una o más, lanza `Error` en español
 * que enumera por nombre TODAS las variables afectadas.
 */
export function readRequiredEnv(): RequiredEnv {
  const { userPoolId, clientId, apiBaseUrl } = readRawEnv();

  const missing: string[] = [];
  if (isBlank(userPoolId)) missing.push(ENV_KEYS.userPoolId);
  if (isBlank(clientId)) missing.push(ENV_KEYS.clientId);
  if (isBlank(apiBaseUrl)) missing.push(ENV_KEYS.apiBaseUrl);

  if (missing.length > 0) {
    throw missingEnvError(missing);
  }

  return {
    userPoolId: (userPoolId as string).trim(),
    clientId: (clientId as string).trim(),
    apiBaseUrl: (apiBaseUrl as string).trim(),
  };
}

/**
 * Cognito es opcional: sin User Pool o sin App Client la app abre igual
 * y el login no puede completarse hasta que existan las dos variables.
 */
export function readCognitoEnvOptional(): {
  userPoolId: string;
  clientId: string;
} | null {
  const { userPoolId, clientId } = readRawEnv();
  if (isBlank(userPoolId) || isBlank(clientId)) return null;
  return {
    userPoolId: (userPoolId as string).trim(),
    clientId: (clientId as string).trim(),
  };
}

/**
 * Variante estricta para el runner de servidor. Enumera las que falten.
 */
export function readCognitoEnv(): { userPoolId: string; clientId: string } {
  const present = readCognitoEnvOptional();
  if (present !== null) return present;

  const { userPoolId, clientId } = readRawEnv();

  const missing: string[] = [];
  if (isBlank(userPoolId)) missing.push(ENV_KEYS.userPoolId);
  if (isBlank(clientId)) missing.push(ENV_KEYS.clientId);

  if (missing.length > 0) {
    throw missingEnvError(missing);
  }

  return {
    userPoolId: (userPoolId as string).trim(),
    clientId: (clientId as string).trim(),
  };
}
