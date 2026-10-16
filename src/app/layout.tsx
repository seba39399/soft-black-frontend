/**
 * Root layout (docs/02 §2). Importa los estilos globales y el CSS de
 * Amplify UI, y monta `<ConfigureAmplify>` para que `Amplify.configure` se
 * ejecute una sola vez al cargar el bundle de cliente.
 */

import type { Metadata } from "next";
import "./globals.css";
import "@aws-amplify/ui-react/styles.css";
import ConfigureAmplify from "@/features/auth/components/ConfigureAmplify";
import { APP_CONFIG } from "@/lib/app-config";

export const metadata: Metadata = {
  title: APP_CONFIG.name,
  description: APP_CONFIG.description,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="es">
      <body>
        <ConfigureAmplify>{children}</ConfigureAmplify>
      </body>
    </html>
  );
}
