"use client";

/**
 * Shell de la app (docs/03 §6). El login es opcional.
 *
 * - Al montar y en cada cambio de ruta: `getCurrentUser()` con timeout de 5 s.
 *   Mientras verifica muestra `<Spinner/>` y NO renderiza el contenido.
 * - Sin sesión, error o timeout → entra como invitado, con el catálogo
 *   completo (`catalogNavItems`). La cabecera ofrece "Iniciar sesión".
 * - Con sesión: mismo catálogo completo. Los grupos no cierran rutas.
 * - Duración máxima de sesión (docs/03 §9): si la sesión superó
 *   `NEXT_PUBLIC_SESSION_MAX_MINUTES` desde el login, la cierra y sigue en
 *   la misma pantalla como invitado. Si sigue vigente, programa el cierre
 *   para ese momento (y lo revisa al volver a la pestaña).
 * - Logout: `signOut()` y se queda en la ruta, ya como invitado. Si falla,
 *   se queda con la sesión y muestra el error.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getCurrentUser, signOut } from "aws-amplify/auth";
import Spinner from "@/components/ui/Spinner";
import { withTimeout } from "@/lib/with-timeout";
import { getAuthTime } from "@/features/auth/utils/cognito-groups";
import {
  isSessionExpired,
  readSessionMaxMinutes,
  sessionDeadlineMs,
} from "@/features/auth/utils/session-limit";
import {
  catalogNavItems,
  type NavItem,
} from "@/features/main-dashboard/utils/nav-config";
import AppHeader from "@/features/main-dashboard/components/AppHeader";
import TopNav from "@/features/main-dashboard/components/TopNav";

interface MainDashboardLayoutProps {
  children: React.ReactNode;
}

const SESSION_CHECK_TIMEOUT_MS = 5_000;

/** Cierra la sesión. Si `signOut` falla, el llamador sigue como invitado. */
async function dropSession(): Promise<void> {
  try {
    await signOut();
  } catch {
    // Sin cookies igual se muestra el catálogo.
  }
}

interface ShellState {
  /** Ruta para la que se armó el shell. */
  authorizedPath: string | null;
  navItems: NavItem[];
  userName?: string;
  /** Epoch ms en que vence la sesión (duración máxima). */
  deadlineMs?: number;
}

function guestShell(pathname: string): ShellState {
  return {
    authorizedPath: pathname,
    navItems: catalogNavItems(),
  };
}

export default function MainDashboardLayout({
  children,
}: MainDashboardLayoutProps): React.ReactElement {
  const pathname = usePathname();

  const [shell, setShell] = useState<ShellState>({
    authorizedPath: null,
    navItems: [],
  });
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function guard(): Promise<void> {
      let user;
      try {
        user = await withTimeout(getCurrentUser(), SESSION_CHECK_TIMEOUT_MS);
      } catch {
        if (!cancelled) setShell(guestShell(pathname));
        return;
      }

      let authTime: number | undefined;
      try {
        authTime = await getAuthTime();
      } catch {
        authTime = undefined;
      }
      if (cancelled) return;

      const maxMinutes = readSessionMaxMinutes();
      if (isSessionExpired(authTime, maxMinutes, Date.now())) {
        await dropSession();
        if (!cancelled) setShell(guestShell(pathname));
        return;
      }

      setShell({
        authorizedPath: pathname,
        navItems: catalogNavItems(),
        userName: user.signInDetails?.loginId ?? user.username,
        deadlineMs: sessionDeadlineMs(authTime, maxMinutes) ?? undefined,
      });
    }

    void guard();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // Cierre automático al llegar a la duración máxima de la sesión.
  const deadlineMs = shell.deadlineMs;
  useEffect(() => {
    if (deadlineMs === undefined) return;
    let done = false;

    function expire(): void {
      if (done) return;
      done = true;
      void dropSession().then(() => {
        setShell(guestShell(pathname));
      });
    }
    // Los timers se congelan con el equipo suspendido: al volver a la
    // pestaña se revisa la hora real.
    function checkNow(): void {
      if (Date.now() >= (deadlineMs as number)) expire();
    }

    const timer = window.setTimeout(expire, Math.max(0, deadlineMs - Date.now()));
    window.addEventListener("focus", checkNow);
    document.addEventListener("visibilitychange", checkNow);
    return () => {
      done = true;
      window.clearTimeout(timer);
      window.removeEventListener("focus", checkNow);
      document.removeEventListener("visibilitychange", checkNow);
    };
  }, [deadlineMs, pathname]);

  async function handleSignOut(): Promise<void> {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await signOut();
      setShell(guestShell(pathname));
      setSigningOut(false);
    } catch {
      setSigningOut(false);
      setSignOutError("No se pudo cerrar la sesión. Intenta de nuevo.");
    }
  }

  // El menú ya cargado se conserva al navegar; el contenido solo se muestra
  // cuando la ruta actual fue autorizada.
  if (shell.authorizedPath === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground street-noise">
        <Spinner label="Verificando sesión" />
      </div>
    );
  }

  const routeReady = shell.authorizedPath === pathname;

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 street-noise"
      />
      <TopNav navItems={shell.navItems} activeHref={pathname} />
      <div className="relative z-10 flex min-w-0 w-full flex-1 flex-col">
        <AppHeader
          navItems={shell.navItems}
          activeHref={pathname}
          userName={shell.userName}
          signingOut={signingOut}
          onSignOut={() => {
            void handleSignOut();
          }}
        />
        {signOutError !== null && (
          <p
            role="alert"
            className="px-4 py-2 text-sm font-medium text-accent sm:px-6"
          >
            {signOutError}
          </p>
        )}
        <main className="w-full flex-1 px-4 pb-6 sm:px-6">
          {routeReady ? children : <Spinner label="Verificando acceso" />}
        </main>
      </div>
    </div>
  );
}
