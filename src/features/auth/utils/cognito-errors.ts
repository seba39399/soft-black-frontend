/**
 * Traductor puro de errores de Cognito → mensajes en español.
 *
 * Centraliza el mapeo de códigos conocidos a mensajes específicos y de los
 * desconocidos a un mensaje genérico. NUNCA expone el código, el identificador
 * técnico ni el texto original del proveedor.
 *
 * El mismo código puede producir un mensaje distinto según la fase del login
 * (credentials vs newPassword), conforme al mapa de la sección Error Handling
 * del diseño.
 */

/** Fase del flujo de login en la que se produjo el error. */
export type ErrorPhase = "credentials" | "newPassword";

/** Mensaje genérico por fase para códigos desconocidos. */
const GENERIC_MESSAGE: Record<ErrorPhase, string> = {
  credentials: "No se pudo iniciar sesión. Intenta de nuevo.",
  newPassword: "No se pudo completar la operación. Intenta de nuevo.",
};

/** Mensajes específicos por código conocido, dependientes de la fase. */
const MESSAGE_MAP: Record<ErrorPhase, Record<string, string>> = {
  credentials: {
    NotAuthorizedException: "Usuario o contraseña incorrectos.",
    // Mismo mensaje que NotAuthorized: no revelar qué usuarios existen.
    UserNotFoundException: "Usuario o contraseña incorrectos.",
    UserNotConfirmedException: "Cuenta pendiente de verificación.",
    NetworkError:
      "No se pudo conectar con el servicio de autenticación. Revisa tu conexión.",
  },
  newPassword: {
    InvalidPasswordException:
      "La contraseña no cumple la política del User Pool (longitud mínima, mayúsculas, números y símbolos).",
    NotAuthorizedException:
      "La sesión de cambio de contraseña expiró. Inicia sesión de nuevo.",
    NetworkError:
      "No se pudo conectar con el servicio de autenticación. Revisa tu conexión.",
  },
};

/**
 * Extrae de forma segura el nombre/código de la excepción sin exponerlo al
 * usuario; solo se usa como clave interna del mapa.
 */
function extractCode(error: unknown): string | undefined {
  if (error && typeof error === "object") {
    const maybe = error as { name?: unknown; code?: unknown };
    if (typeof maybe.name === "string" && maybe.name.length > 0) {
      return maybe.name;
    }
    if (typeof maybe.code === "string" && maybe.code.length > 0) {
      return maybe.code;
    }
  }
  return undefined;
}

/**
 * Traduce un error de Cognito a un mensaje en español según la fase.
 * Los códigos conocidos producen su mensaje específico; los desconocidos
 * producen el mensaje genérico de la fase. El resultado nunca contiene el
 * código ni el texto original del proveedor.
 */
export function translateCognitoError(
  error: unknown,
  phase: ErrorPhase,
): string {
  const code = extractCode(error);
  // Object.hasOwn: un código como "constructor" no debe resolver a un
  // método de Object.prototype.
  if (code && Object.hasOwn(MESSAGE_MAP[phase], code)) {
    return MESSAGE_MAP[phase][code];
  }
  return GENERIC_MESSAGE[phase];
}
