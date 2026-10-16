/**
 * Indicador de carga accesible.
 *
 * Expone `role="status"` y un `aria-label` en español para tecnologías de
 * asistencia. El texto por defecto es "Cargando"; puede personalizarse por
 * props sin perder accesibilidad.
 */

export interface SpinnerProps {
  /** Texto accesible en español. Por defecto "Cargando". */
  label?: string;
}

export default function Spinner({
  label = "Cargando",
}: SpinnerProps): React.ReactElement {
  return (
    <div
      role="status"
      aria-label={label}
      className="flex items-center justify-center gap-3 text-foreground"
    >
      <span
        aria-hidden="true"
        className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-accent"
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
