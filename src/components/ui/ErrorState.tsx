/**
 * Estado de error reutilizable (docs/05 §4): mensaje con `role="alert"` y
 * botón opcional de reintento.
 */

export interface ErrorStateProps {
  /** Mensaje en español, listo para el usuario. */
  message: string;
  /** Si se pasa, muestra el botón "Reintentar". */
  onRetry?: () => void;
}

export default function ErrorState({
  message,
  onRetry,
}: ErrorStateProps): React.ReactElement {
  return (
    <div
      role="alert"
      className="rounded-none border-2 border-accent bg-background p-4 text-sm text-accent shadow-hard"
    >
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-none border-2 border-accent bg-accent px-3 py-1.5 font-black uppercase tracking-wide text-accent-ink hover:bg-background hover:text-accent"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
