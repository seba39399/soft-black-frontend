/**
 * Estado vacío reutilizable (docs/05 §4): se muestra cuando la consulta
 * responde bien pero no hay datos.
 */

export interface EmptyStateProps {
  message: string;
}

export default function EmptyState({
  message,
}: EmptyStateProps): React.ReactElement {
  return (
    <p className="rounded-none border-2 border-dashed border-white/20 p-6 text-center text-sm text-foreground/80">
      {message}
    </p>
  );
}
