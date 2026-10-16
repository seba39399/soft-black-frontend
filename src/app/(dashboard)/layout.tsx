/**
 * Layout privado. Solo enruta: envuelve el contenido en el shell privado
 * con guard de cliente.
 */

import MainDashboardLayout from "@/features/main-dashboard/components/MainDashboardLayout";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <MainDashboardLayout>{children}</MainDashboardLayout>;
}
