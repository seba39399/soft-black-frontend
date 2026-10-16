/**
 * Runner de servidor de Amplify.
 *
 * Expone `runWithAmplifyServerContext` de `createServerRunner`. Valida las
 * variables de entorno de Cognito con `readCognitoEnv()` a nivel de módulo; si
 * falta/vacía, `readCognitoEnv()` lanza un `Error` en español indicando cuál
 * falta y el runner NO queda expuesto de forma usable.
 *
 * Usar siempre el subpath `aws-amplify/auth/server` dentro del proxy y de
 * Server Components junto a este runner.
 */

import { createServerRunner } from "@aws-amplify/adapter-nextjs";
import { readCognitoEnv } from "@/features/auth/utils/env";

// A nivel de módulo: valida el entorno ANTES de crear el runner.
const { userPoolId, clientId } = readCognitoEnv();

export const { runWithAmplifyServerContext } = createServerRunner({
  config: {
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId: clientId,
      },
    },
  },
});
