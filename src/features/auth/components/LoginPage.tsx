"use client";

/**
 * Login con formulario propio (docs/03 §3–§5). No usa `<Authenticator>`.
 *
 * Dos fases: `credentials` (usuario + contraseña) y `newPassword` (cambio
 * obligatorio de la contraseña temporal de Cognito).
 *
 * - Al montar: `getCurrentUser()` con timeout de 10 s, ocultando el
 *   formulario. Con sesión → redirección post-login.
 * - Redirección post-login: primera ruta del catálogo. El login no es
 *   obligatorio y no cierra la sesión por falta de grupos.
 * - Sesión vencida por tiempo (docs/03 §9): si la sesión existe pero pasó
 *   `NEXT_PUBLIC_SESSION_MAX_MINUTES`, la cierra y lo explica. Si llega con
 *   `?expired=1` (la cerró el layout o el proxy), muestra el mismo mensaje.
 * - Validaciones simples ANTES del await (no se llama a Cognito en vano).
 * - Errores siempre traducidos con `translateCognitoError`.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  confirmSignIn,
  getCurrentUser,
  signIn,
  signOut,
} from "aws-amplify/auth";
import { getAuthTime } from "@/features/auth/utils/cognito-groups";
import {
  isSessionExpired,
  readSessionMaxMinutes,
  SESSION_EXPIRED_MESSAGE,
  SESSION_EXPIRED_PARAM,
} from "@/features/auth/utils/session-limit";
import { translateCognitoError } from "@/features/auth/utils/cognito-errors";
import { catalogNavItems } from "@/features/main-dashboard/utils/nav-config";
import { APP_CONFIG } from "@/lib/app-config";
import { withTimeout } from "@/lib/with-timeout";

type Phase = "credentials" | "newPassword";

interface LoginState {
  phase: Phase;
  checkingSession: boolean;
  username: string;
  password: string;
  newPassword: string;
  confirmPassword: string;
  submitting: boolean;
  errorMessage: string | null;
}

const INITIAL_STATE: LoginState = {
  phase: "credentials",
  checkingSession: true,
  username: "",
  password: "",
  newPassword: "",
  confirmPassword: "",
  submitting: false,
  errorMessage: null,
};

/** Timeout de la verificación de sesión al montar. */
const SESSION_CHECK_TIMEOUT_MS = 10_000;

export default function LoginPage(): React.ReactElement {
  const router = useRouter();
  const [state, setState] = useState<LoginState>(INITIAL_STATE);

  /**
   * Tras un login válido vuelve a la app. El catálogo está abierto: no
   * importa si el usuario tiene grupos asignados.
   */
  function redirectAfterSignIn(): void {
    const home = catalogNavItems()[0]?.href ?? "/";
    router.replace(home);
  }

  // Gate al montar: verifica sesión existente con timeout de 10s.
  useEffect(() => {
    let cancelled = false;

    const cameExpired =
      new URLSearchParams(window.location.search).get(SESSION_EXPIRED_PARAM) === "1";

    // Solo pisa el mensaje si hay uno nuevo: no borra un error ya visible.
    function showForm(errorMessage: string | null): void {
      setState((prev) => ({
        ...prev,
        checkingSession: false,
        errorMessage: errorMessage ?? prev.errorMessage,
      }));
    }

    async function checkSession(): Promise<void> {
      try {
        await withTimeout(getCurrentUser(), SESSION_CHECK_TIMEOUT_MS);
      } catch {
        // Falla, lanza o excede 10s → mostrar formulario sin redirigir.
        if (cancelled) return;
        showForm(cameExpired ? SESSION_EXPIRED_MESSAGE : null);
        return;
      }
      if (cancelled) return;

      // Sesión que superó la duración máxima → cerrarla y explicarlo.
      let authTime: number | undefined;
      try {
        authTime = await getAuthTime();
      } catch {
        authTime = undefined;
      }
      if (cancelled) return;
      if (isSessionExpired(authTime, readSessionMaxMinutes(), Date.now())) {
        try {
          await signOut();
        } catch {
          // Si falla el signOut igual se muestra el formulario.
        }
        if (cancelled) return;
        showForm(SESSION_EXPIRED_MESSAGE);
        return;
      }
      // Sesión activa → primera pantalla del catálogo.
      redirectAfterSignIn();
    }

    void checkSession();

    return () => {
      cancelled = true;
    };
    // redirectAfterSignIn solo depende de router y setState (estables).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function handleCredentialsSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    // Validación síncrona ANTES del await: no llama `signIn`.
    if (state.username.trim() === "" || state.password === "") {
      setState((prev) => ({
        ...prev,
        errorMessage: "Usuario y contraseña son obligatorios.",
      }));
      return;
    }

    setState((prev) => ({ ...prev, submitting: true, errorMessage: null }));

    try {
      const { isSignedIn, nextStep } = await signIn({
        username: state.username,
        password: state.password,
      });

      if (isSignedIn) {
        await redirectAfterSignIn();
        return;
      }

      if (
        nextStep.signInStep ===
        "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
      ) {
        setState((prev) => ({
          ...prev,
          phase: "newPassword",
          submitting: false,
          password: "",
          newPassword: "",
          confirmPassword: "",
          errorMessage: null,
        }));
        return;
      }

      // Otro paso no soportado: reactivar botón sin exponer detalle técnico.
      setState((prev) => ({
        ...prev,
        submitting: false,
        password: "",
        errorMessage: translateCognitoError(null, "credentials"),
      }));
    } catch (err) {
      // Tras error: reactiva botón, preserva usuario, limpia contraseña.
      setState((prev) => ({
        ...prev,
        submitting: false,
        password: "",
        errorMessage: translateCognitoError(err, "credentials"),
      }));
    }
  }

  async function handleNewPasswordSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    // Validación síncrona: vacíos → error sin llamar a Cognito.
    if (state.newPassword === "" || state.confirmPassword === "") {
      setState((prev) => ({
        ...prev,
        errorMessage: "La nueva contraseña y su confirmación son obligatorias.",
      }));
      return;
    }

    // No coinciden → error sin llamar a Cognito.
    if (state.newPassword !== state.confirmPassword) {
      setState((prev) => ({
        ...prev,
        errorMessage: "Las contraseñas no coinciden.",
      }));
      return;
    }

    setState((prev) => ({ ...prev, submitting: true, errorMessage: null }));

    try {
      const { isSignedIn } = await confirmSignIn({
        challengeResponse: state.newPassword,
      });

      if (isSignedIn) {
        await redirectAfterSignIn();
        return;
      }

      setState((prev) => ({
        ...prev,
        submitting: false,
        errorMessage: translateCognitoError(null, "newPassword"),
      }));
    } catch (err) {
      const code =
        err && typeof err === "object" && "name" in err
          ? (err as { name?: unknown }).name
          : undefined;

      // NotAuthorizedException → el challenge expiró: vuelve a credentials.
      if (code === "NotAuthorizedException") {
        setState((prev) => ({
          ...prev,
          phase: "credentials",
          submitting: false,
          newPassword: "",
          confirmPassword: "",
          password: "",
          errorMessage: translateCognitoError(err, "newPassword"),
        }));
        return;
      }

      // InvalidPasswordException u otra → permanece en fase newPassword.
      setState((prev) => ({
        ...prev,
        submitting: false,
        errorMessage: translateCognitoError(err, "newPassword"),
      }));
    }
  }

  // Mientras verifica la sesión: oculta el formulario (evita el "flash").
  if (state.checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground street-noise">
        <p role="status" aria-label="Verificando sesión">
          Verificando sesión…
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground street-noise">
      <div className="w-full max-w-sm rounded-none border-2 border-white/20 bg-black/80 p-6 shadow-hard backdrop-blur-sm">
        <p className="mb-1 text-sm font-black uppercase tracking-[0.18em] text-accent">
          {APP_CONFIG.name}
        </p>
        <h1 className="mb-6 text-xl font-black uppercase tracking-[0.12em]">
          Iniciar sesión
        </h1>

        {state.errorMessage !== null && (
          <p
            role="alert"
            className="mb-4 rounded-none border-2 border-accent bg-background px-3 py-2 text-sm text-accent"
          >
            {state.errorMessage}
          </p>
        )}

        {state.phase === "credentials" ? (
          <form onSubmit={handleCredentialsSubmit} noValidate>
            <div className="mb-4">
              <label
                htmlFor="username"
                className="mb-1 block text-sm font-medium"
              >
                Usuario
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                className="w-full rounded-none border-2 border-white/20 bg-background px-3 py-2 text-foreground"
                value={state.username}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, username: e.target.value }))
                }
              />
            </div>

            <div className="mb-6">
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium"
              >
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="w-full rounded-none border-2 border-white/20 bg-background px-3 py-2 text-foreground"
                value={state.password}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, password: e.target.value }))
                }
              />
            </div>

            <button
              type="submit"
              disabled={state.submitting}
              className="w-full rounded-none border-2 border-accent bg-accent px-4 py-2 font-black uppercase tracking-wide text-accent-ink shadow-hard disabled:opacity-60"
            >
              {state.submitting ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleNewPasswordSubmit} noValidate>
            <p className="mb-4 text-sm text-foreground/80">
              Debes definir una nueva contraseña para continuar.
            </p>

            <div className="mb-4">
              <label
                htmlFor="newPassword"
                className="mb-1 block text-sm font-medium"
              >
                Nueva contraseña
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                className="w-full rounded-none border-2 border-white/20 bg-background px-3 py-2 text-foreground"
                value={state.newPassword}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, newPassword: e.target.value }))
                }
              />
            </div>

            <div className="mb-6">
              <label
                htmlFor="confirmPassword"
                className="mb-1 block text-sm font-medium"
              >
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="w-full rounded-none border-2 border-white/20 bg-background px-3 py-2 text-foreground"
                value={state.confirmPassword}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
              />
            </div>

            <button
              type="submit"
              disabled={state.submitting}
              className="w-full rounded-none border-2 border-accent bg-accent px-4 py-2 font-black uppercase tracking-wide text-accent-ink shadow-hard disabled:opacity-60"
            >
              {state.submitting ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm">
          <Link href="/" className="font-medium text-accent underline">
            Continuar sin iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
