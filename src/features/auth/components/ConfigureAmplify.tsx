"use client";

/**
 * Configuración del cliente Amplify.
 *
 * Ejecuta `Amplify.configure` UNA sola vez a nivel de módulo (no en render)
 * cuando hay User Pool y App Client. Si faltan, no configura Amplify: la app
 * abre igual y el login queda sin servicio hasta completar `.env.local`.
 * La ejecución a nivel de módulo garantiza una única invocación por carga del
 * bundle, invariante a re-render. Este es el ÚNICO lugar del proyecto donde se
 * invoca `Amplify.configure`.
 *
 * Si faltan las variables de Cognito, no se invoca `Amplify.configure`.
 */

import { Amplify } from "aws-amplify";
import { readCognitoEnvOptional } from "@/features/auth/utils/env";
import { readSessionMaxMinutes } from "@/features/auth/utils/session-limit";

const cognito = readCognitoEnvOptional();
// Falla al arrancar si NEXT_PUBLIC_SESSION_MAX_MINUTES tiene un valor inválido.
readSessionMaxMinutes();

if (cognito !== null) {
  Amplify.configure(
    {
      Auth: {
        Cognito: {
          userPoolId: cognito.userPoolId,
          userPoolClientId: cognito.clientId,
        },
      },
    },
    { ssr: true },
  );
}

/**
 * Envuelve la app en el root layout. No renderiza UI propia: solo
 * garantiza que la configuración de Amplify se ejecute al cargar el bundle
 * de cliente.
 */
export default function ConfigureAmplify({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <>{children}</>;
}
