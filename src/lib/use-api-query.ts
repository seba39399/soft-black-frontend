"use client";

/**
 * Hook de carga de datos para pantallas (docs/02 §5, 07 §3).
 *
 * - Ejecuta `fetcher` al montar y cada vez que cambian `deps`.
 * - Expone `loading`, `error` (mensaje en español) y `data`.
 * - 401 → muestra el error en la pantalla. El login es opcional, así que
 *   no saca al usuario de la ruta.
 * - `reload()` vuelve a ejecutar la consulta.
 */

import { useCallback, useEffect, useState, type DependencyList } from "react";
import { ApiRequestError } from "@/lib/api-client";

const GENERIC_ERROR = "Ocurrió un error inesperado. Intenta de nuevo.";

interface QueryState<T> {
  /** Identificador de la consulta a la que corresponde este resultado. */
  key: string;
  data: T | null;
  error: string | null;
}

export interface ApiQueryResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

export function useApiQuery<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList,
): ApiQueryResult<T> {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<QueryState<T> | null>(null);

  // Clave de la consulta actual: cambia con deps o con reload().
  const key = JSON.stringify([attempt, ...deps]);

  useEffect(() => {
    let cancelled = false;

    fetcher().then(
      (data) => {
        if (!cancelled) setState({ key, data, error: null });
      },
      (err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof ApiRequestError ? err.message : GENERIC_ERROR;
        setState({ key, data: null, error: message });
      },
    );

    return () => {
      cancelled = true;
    };
    // `fetcher` cambia en cada render; la consulta se repite solo cuando
    // cambia `key` (deps o reload).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const current = state?.key === key ? state : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: current === null,
    reload,
  };
}
