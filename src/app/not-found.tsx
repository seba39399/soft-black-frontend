/**
 * 404 global. Solo enruta: mensaje simple con enlace al inicio.
 */

import Link from "next/link";

export default function NotFound(): React.ReactElement {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground street-noise">
      <h1 className="text-xl font-black uppercase tracking-[0.14em]">Página no encontrada</h1>
      <p className="text-sm text-foreground/80">La dirección no existe o fue movida.</p>
      <Link href="/" className="rounded-none border-2 border-accent bg-accent px-3 py-1.5 text-sm font-black uppercase tracking-wide text-accent-ink shadow-hard">
        Volver al inicio
      </Link>
    </main>
  );
}
