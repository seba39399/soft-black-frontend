"use client";

/**
 * Pantalla de ejemplo `dashboard_1`. Confirma que el acceso privado funciona
 * de extremo a extremo y muestra con qué usuario y grupos entraste.
 *
 * Al crear tu primer dashboard (docs/02 §5) puedes borrar este feature,
 * su ruta y su entrada en `nav-config.ts`.
 */

import Spinner from "@/components/ui/Spinner";
import { useSessionSummary } from "@/features/dashboard_1/utils/use-session-summary";

export default function Dashboard1Page(): React.ReactElement {
  const summary = useSessionSummary();

  return (
    <section className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Hola mundo</h2>
        <p className="mt-1 text-sm text-foreground/80">
          Esta pantalla está disponible sin iniciar sesión. Si entras, aquí
          ves tu usuario y tus grupos.
        </p>
      </div>

      {summary === null ? (
        <Spinner label="Cargando sesión" />
      ) : (
        <dl className="divide-y divide-white/20 rounded-none border-2 border-white/20 text-sm shadow-hard">
          <div className="grid grid-cols-3 gap-4 px-4 py-3">
            <dt className="font-medium text-accent">Usuario</dt>
            <dd className="col-span-2 break-all">{summary.userName}</dd>
          </div>
          <div className="grid grid-cols-3 gap-4 px-4 py-3">
            <dt className="font-medium text-accent">Grupos</dt>
            <dd className="col-span-2">
              {summary.groups.length > 0 ? summary.groups.join(", ") : "—"}
            </dd>
          </div>
          <div className="grid grid-cols-3 gap-4 px-4 py-3">
            <dt className="font-medium text-accent">Dashboards</dt>
            <dd className="col-span-2">
              {summary.dashboards.map((item) => item.label).join(", ")}
            </dd>
          </div>
        </dl>
      )}

      <p className="text-sm text-foreground/80">
        Siguiente paso: crea tu primer dashboard siguiendo{" "}
        <code className="rounded-none border border-accent bg-background px-1 py-0.5 text-accent">
          docs/02-arquitectura.md §5
        </code>
        .
      </p>
    </section>
  );
}
