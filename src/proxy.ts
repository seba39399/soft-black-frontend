/**
 * El login es opcional (docs/03 §1 y §7).
 *
 * Next.js 16: el antiguo `middleware.ts` se renombró a `proxy.ts` y la función
 * exportada pasó de `middleware` a `proxy`. Corre en runtime Node (no Edge).
 * NO admite `export const runtime` (declararlo rompe el build).
 *
 * Esta función deja pasar todas las rutas. No redirige a `/login` ni corta
 * por grupo de Cognito: la aplicación se recorre sin sesión. Quien quiera
 * identificarse entra por `/login` desde la cabecera.
 *
 * El `matcher` se mantiene literal. No lo cambies al agregar dashboards.
 */

import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest): Response {
  return NextResponse.next({
    request: { headers: request.headers },
  });
}

// El matcher sigue excluyendo /login, los internos de Next y los estáticos
// para no interceptar assets. Las rutas de la app pasan y se sirven igual.
// Debe ser un literal.
export const config = {
  matcher: [
    "/((?!login$|login/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
