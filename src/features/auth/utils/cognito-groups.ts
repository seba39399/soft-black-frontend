/**
 * Lectura de claims de Cognito (grupos e inicio de sesión).
 *
 * Lee el claim `cognito:groups` del access token vía `fetchAuthSession`.
 * Devuelve únicamente los elementos de tipo string cuando el claim es un
 * array; en cualquier otro caso (ausente, sin sesión, `null`, valor no-array)
 * devuelve una lista vacía.
 */

import { fetchAuthSession } from "aws-amplify/auth";

/**
 * Grupos del usuario leídos del claim `cognito:groups` del access token.
 * `[]` si ausente/inválido/sin sesión.
 */
export async function getUserGroups(): Promise<string[]> {
  const session = await fetchAuthSession();
  const claim = session.tokens?.accessToken?.payload?.["cognito:groups"];

  if (Array.isArray(claim)) {
    return claim.filter((g): g is string => typeof g === "string");
  }

  return [];
}

/**
 * Claim `auth_time` del access token: segundos epoch del inicio de sesión.
 * Cognito lo conserva al renovar el token. `undefined` si no hay sesión o el
 * claim no es un número (la sesión se tratará como vencida).
 */
export async function getAuthTime(): Promise<number | undefined> {
  const session = await fetchAuthSession();
  const claim = session.tokens?.accessToken?.payload?.auth_time;
  return typeof claim === "number" ? claim : undefined;
}
