/**
 * Formas transversales del contrato de API.
 *
 * El contrato vive en el backend (`soft-black-frontend-backend/docs/contrato/openapi.yaml`; copia en
 * `docs/contrato/openapi.yaml`). Aquí solo van las formas comunes a todos los
 * endpoints; los tipos de cada dominio van en `src/features/<feature>/types.ts`.
 */

/** Envoltura de error estándar del contrato (schema `Error`). */
export interface ApiError {
  /** Mensaje legible en español. */
  error: string;
  /** Código máquina (`VALIDATION_ERROR`, `FORBIDDEN`…). */
  code?: string;
}

/**
 * Página de un listado paginado por cursor (docs/07 §4).
 *
 * `nextCursor` es opaco: se reenvía tal cual como `?cursor=`. `null` = no hay más.
 */
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}
