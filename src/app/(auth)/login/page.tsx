/**
 * Ruta `/login`. Solo enruta: delega en la feature `auth`.
 */

import LoginPage from "@/features/auth/components/LoginPage";

export default function Page(): React.ReactElement {
  return <LoginPage />;
}
