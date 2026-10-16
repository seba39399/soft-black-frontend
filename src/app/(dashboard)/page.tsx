/**
 * Ruta raíz `/`. Redirige a la primera ruta del catálogo. El login es
 * opcional: esta entrada no exige sesión.
 */

import { redirect } from "next/navigation";
import { NAV_ITEMS } from "@/features/main-dashboard/utils/nav-config";

export default function Page(): never {
  const first = Object.values(NAV_ITEMS)[0];
  redirect(first?.href ?? "/login");
}
