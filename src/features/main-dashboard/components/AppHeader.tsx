"use client";

/**
 * Cabecera: título de la pantalla activa. Con sesión muestra el usuario y
 * el logout; sin sesión, un enlace a `/login` (el login es opcional).
 * La navegación vive en `TopNav`, no aquí.
 */

import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";
import { APP_CONFIG } from "@/lib/app-config";
import {
  isRouteActive,
  type NavItem,
} from "@/features/main-dashboard/utils/nav-config";

export interface AppHeaderProps {
  navItems: NavItem[];
  activeHref: string;
  /** Usuario conectado (email o username), si se conoce. */
  userName?: string;
  onSignOut: () => void;
  signingOut?: boolean;
}

export default function AppHeader({
  navItems,
  activeHref,
  userName,
  onSignOut,
  signingOut = false,
}: AppHeaderProps): React.ReactElement {
  const activeItem = navItems.find((item) =>
    isRouteActive(item.href, activeHref),
  );

  return (
    <header className="flex w-full items-start justify-between gap-4 px-4 pt-24 sm:px-6">
      <h1 className="truncate text-base font-black uppercase tracking-[0.18em] text-foreground">
        {activeItem?.label ?? APP_CONFIG.name}
      </h1>
      <div className="flex shrink-0 items-center gap-3">
        {userName ? (
          <>
            <span
              className="hidden max-w-56 truncate text-sm text-foreground/80 sm:inline"
              title={userName}
            >
              {userName}
            </span>
            <button
              type="button"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              onClick={onSignOut}
              disabled={signingOut}
              className="rounded-none border-2 border-accent bg-background p-2 text-accent shadow-hard hover:bg-accent hover:text-accent-ink disabled:opacity-50"
            >
              <LogOut aria-hidden="true" className="h-5 w-5" />
            </button>
          </>
        ) : (
            <Link
              href="/login"
              aria-label="Iniciar sesión"
              className="inline-flex items-center gap-2 rounded-none border-2 border-accent bg-background px-3 py-2 text-sm font-black uppercase tracking-wide text-accent shadow-hard hover:bg-accent hover:text-accent-ink"
            >
            <LogIn aria-hidden="true" className="h-4 w-4" />
            <span className="hidden sm:inline">Iniciar sesión</span>
          </Link>
        )}
      </div>
    </header>
  );
}
