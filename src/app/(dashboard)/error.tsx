"use client";

/**
 * Error boundary del grupo privado (Next 16: recibe `unstable_retry`).
 * Solo enruta: delega el render en `ErrorState`.
 */

import { useEffect } from "react";
import ErrorState from "@/components/ui/ErrorState";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}): React.ReactElement {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      message="Ocurrió un error inesperado al mostrar esta pantalla."
      onRetry={unstable_retry}
    />
  );
}
