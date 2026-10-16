import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("aws-amplify/auth", () => ({
  getCurrentUser: vi.fn(),
  signIn: vi.fn(),
  confirmSignIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/features/auth/utils/cognito-groups", () => ({
  getUserGroups: vi.fn(),
  getAuthTime: vi.fn(),
}));

import { confirmSignIn, getCurrentUser, signIn, signOut } from "aws-amplify/auth";
import { getAuthTime, getUserGroups } from "@/features/auth/utils/cognito-groups";
import LoginPage from "@/features/auth/components/LoginPage";

const noSession = () =>
  vi.mocked(getCurrentUser).mockRejectedValue(new Error("UserUnAuthenticatedException"));

async function fillAndSubmit(user = "ana@empresa.com", pass = "Secreta123!") {
  const u = userEvent.setup();
  await u.type(await screen.findByLabelText("Usuario"), user);
  await u.type(screen.getByLabelText("Contraseña"), pass);
  await u.click(screen.getByRole("button", { name: "Ingresar" }));
  return u;
}

/** `auth_time` de hace `minutes` minutos (segundos epoch). */
const loggedInMinutesAgo = (minutes: number) =>
  Math.floor(Date.now() / 1000) - minutes * 60;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthTime).mockResolvedValue(loggedInMinutesAgo(1));
});

describe("LoginPage", () => {
  it("sin sesión muestra el formulario", async () => {
    noSession();
    render(<LoginPage />);
    expect(await screen.findByLabelText("Usuario")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Continuar sin iniciar sesión" }),
    ).toHaveAttribute("href", "/");
    expect(replace).not.toHaveBeenCalled();
  });

  it("no llama a Cognito si faltan datos", async () => {
    noSession();
    render(<LoginPage />);
    const u = userEvent.setup();
    await u.click(await screen.findByRole("button", { name: "Ingresar" }));
    expect(screen.getByRole("alert")).toHaveTextContent("obligatorios");
    expect(signIn).not.toHaveBeenCalled();
  });

  it("tras el login redirige a la primera ruta del catálogo", async () => {
    noSession();
    vi.mocked(signIn).mockResolvedValue({
      isSignedIn: true,
      nextStep: { signInStep: "DONE" },
    });
    render(<LoginPage />);
    await fillAndSubmit();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/inicio"));
  });

  it("usuario sin grupos entra igual a la primera ruta", async () => {
    noSession();
    vi.mocked(signIn).mockResolvedValue({
      isSignedIn: true,
      nextStep: { signInStep: "DONE" },
    });
    vi.mocked(getUserGroups).mockResolvedValue(["grupo-sin-mapear"]);
    render(<LoginPage />);
    await fillAndSubmit();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/inicio"));
    expect(signOut).not.toHaveBeenCalled();
  });

  it("con sesión activa al entrar, redirige sin mostrar el formulario", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      username: "ana",
      userId: "1",
    });
    vi.mocked(getUserGroups).mockResolvedValue(["admin"]);
    render(<LoginPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/inicio"));
    expect(screen.queryByLabelText("Usuario")).not.toBeInTheDocument();
  });

  it("contraseña temporal: pide la nueva y la confirma", async () => {
    noSession();
    vi.mocked(signIn).mockResolvedValue({
      isSignedIn: false,
      nextStep: {
        signInStep: "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED",
      },
    } as Awaited<ReturnType<typeof signIn>>);
    vi.mocked(confirmSignIn).mockResolvedValue({
      isSignedIn: true,
      nextStep: { signInStep: "DONE" },
    });
    vi.mocked(getUserGroups).mockResolvedValue(["admin"]);
    render(<LoginPage />);
    const u = await fillAndSubmit();

    await u.type(await screen.findByLabelText("Nueva contraseña"), "Nueva123!");
    await u.type(screen.getByLabelText("Confirmar contraseña"), "Nueva123!");
    await u.click(screen.getByRole("button", { name: /Guardar|Cambiar|Confirmar/ }));

    await waitFor(() =>
      expect(confirmSignIn).toHaveBeenCalledWith({ challengeResponse: "Nueva123!" }),
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/inicio"));
  });

  it("credenciales incorrectas: mensaje en español y conserva el usuario", async () => {
    noSession();
    vi.mocked(signIn).mockRejectedValue(
      Object.assign(new Error("Incorrect username or password."), {
        name: "NotAuthorizedException",
      }),
    );
    render(<LoginPage />);
    await fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Usuario o contraseña incorrectos.",
    );
    expect(screen.getByLabelText("Usuario")).toHaveValue("ana@empresa.com");
    expect(screen.getByLabelText("Contraseña")).toHaveValue("");
  });

  it("con sesión vencida por tiempo, la cierra y muestra el aviso", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ username: "ana", userId: "1" });
    vi.mocked(getAuthTime).mockResolvedValue(loggedInMinutesAgo(90));
    vi.mocked(signOut).mockResolvedValue();
    render(<LoginPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Tu sesión expiró");
    expect(signOut).toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Usuario")).toBeInTheDocument();
  });

  it("al llegar con ?expired=1 sin sesión muestra el aviso", async () => {
    noSession();
    window.history.pushState({}, "", "/login?expired=1");
    render(<LoginPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Tu sesión expiró");
    window.history.pushState({}, "", "/");
  });
});
