import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const replace = vi.fn();
let pathname = "/dashboard_1";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => pathname,
}));

vi.mock("aws-amplify/auth", () => ({
  getCurrentUser: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/features/auth/utils/cognito-groups", () => ({
  getUserGroups: vi.fn(),
  getAuthTime: vi.fn(),
}));

import { getCurrentUser, signOut } from "aws-amplify/auth";
import { getAuthTime, getUserGroups } from "@/features/auth/utils/cognito-groups";
import MainDashboardLayout from "@/features/main-dashboard/components/MainDashboardLayout";

const withSession = () =>
  vi.mocked(getCurrentUser).mockResolvedValue({
    username: "abc-123",
    userId: "abc-123",
    signInDetails: { loginId: "ana@empresa.com" },
  });

/** `auth_time` de hace `minutes` minutos (segundos epoch). */
const loggedInMinutesAgo = (minutes: number) =>
  Math.floor(Date.now() / 1000) - minutes * 60;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthTime).mockResolvedValue(loggedInMinutesAgo(1));
  pathname = "/dashboard_1";
});

describe("MainDashboardLayout", () => {
  it("sin sesión muestra el contenido y ofrece iniciar sesión", async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error("no session"));
    render(<MainDashboardLayout><p>privado</p></MainDashboardLayout>);
    expect(await screen.findByText("privado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("con sesión muestra el contenido, el menú y el usuario", async () => {
    pathname = "/inicio";
    withSession();
    vi.mocked(getUserGroups).mockResolvedValue(["admin"]);
    render(<MainDashboardLayout><p>privado</p></MainDashboardLayout>);
    expect(await screen.findByText("privado")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "INICIO" });
    expect(link).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "ARTISTAS" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByText("ana@empresa.com")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("sin grupos asignados muestra el contenido", async () => {
    withSession();
    vi.mocked(getUserGroups).mockResolvedValue([]);
    render(<MainDashboardLayout><p>privado</p></MainDashboardLayout>);
    expect(await screen.findByText("privado")).toBeInTheDocument();
    expect(screen.getByText("ana@empresa.com")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("logout: cierra sesión y se queda en la pantalla", async () => {
    withSession();
    vi.mocked(getUserGroups).mockResolvedValue(["admin"]);
    vi.mocked(signOut).mockResolvedValue();
    render(<MainDashboardLayout><p>privado</p></MainDashboardLayout>);
    await screen.findByText("privado");
    await userEvent.setup().click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("privado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeInTheDocument();
  });

  it("si el logout falla, se queda y muestra el error", async () => {
    withSession();
    vi.mocked(getUserGroups).mockResolvedValue(["admin"]);
    vi.mocked(signOut).mockRejectedValue(new Error("network"));
    render(<MainDashboardLayout><p>privado</p></MainDashboardLayout>);
    await screen.findByText("privado");
    await userEvent.setup().click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cerrar la sesión");
    expect(screen.getByText("privado")).toBeInTheDocument();
  });

  it("sesión que superó la duración máxima: la cierra y sigue como invitado", async () => {
    withSession();
    vi.mocked(getUserGroups).mockResolvedValue(["admin"]);
    vi.mocked(getAuthTime).mockResolvedValue(loggedInMinutesAgo(61));
    vi.mocked(signOut).mockResolvedValue();
    render(<MainDashboardLayout><p>privado</p></MainDashboardLayout>);
    expect(await screen.findByText("privado")).toBeInTheDocument();
    expect(signOut).toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeInTheDocument();
  });

  it("sin auth_time en el token se trata como vencida y sigue abierto", async () => {
    withSession();
    vi.mocked(getUserGroups).mockResolvedValue(["admin"]);
    vi.mocked(getAuthTime).mockResolvedValue(undefined);
    vi.mocked(signOut).mockResolvedValue();
    render(<MainDashboardLayout><p>privado</p></MainDashboardLayout>);
    expect(await screen.findByText("privado")).toBeInTheDocument();
    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
  });

  it("cierra la sesión sola cuando llega al límite y se queda en la pantalla", async () => {
    withSession();
    vi.mocked(getUserGroups).mockResolvedValue(["admin"]);
    vi.mocked(signOut).mockResolvedValue();
    // Vence en ~0,3 s: login hace (60 min - 0,3 s).
    vi.mocked(getAuthTime).mockResolvedValue((Date.now() - 60 * 60_000 + 300) / 1000);
    render(<MainDashboardLayout><p>privado</p></MainDashboardLayout>);
    expect(await screen.findByText("privado")).toBeInTheDocument();
    expect(signOut).not.toHaveBeenCalled();
    await waitFor(() => expect(signOut).toHaveBeenCalled(), { timeout: 2000 });
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("privado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeInTheDocument();
  });
});
