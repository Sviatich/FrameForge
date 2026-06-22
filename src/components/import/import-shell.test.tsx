// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImportShell } from "./import-shell";

const router = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/",
}));

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

function renderImportShell() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ImportShell />
    </QueryClientProvider>,
  );
}

describe("ImportShell", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    router.push.mockReset();
  });

  it("offers account connection when the user is not authorized", async () => {
    vi.stubGlobal("fetch", vi.fn(() => jsonResponse({ connected: false, expiresAt: null, userId: null })));

    renderImportShell();

    expect(await screen.findByRole("link", { name: /подключить/i })).toHaveAttribute("href", "/api/auth/figma/start");
  });

  it("loads a valid Figma link and opens the local workspace", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      if (String(input) === "/api/auth/figma/session") {
        return jsonResponse({ connected: true, expiresAt: Date.now() + 60_000, userId: "user-1" });
      }

      return jsonResponse({
        fileKey: "abc123",
        fileName: "Demo",
        mode: "live",
        frames: [{ id: "1:1", name: "Desktop", type: "FRAME", depth: 1, hasAutoLayout: true }],
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderImportShell();

    const input = await screen.findByPlaceholderText("Вставьте ссылку на Figma-макет");
    await user.type(input, "https://www.figma.com/design/abc123/Demo");
    await user.click(screen.getByRole("button", { name: /загрузить/i }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/projects/local"));
    expect(sessionStorage.getItem("transfig:workspace-session")).toContain('"fileName":"Demo"');
  });

  it("logs the user out when the API reports an expired session", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      if (String(input) === "/api/auth/figma/session") {
        return jsonResponse({ connected: true, expiresAt: Date.now() + 60_000, userId: "user-1" });
      }

      return jsonResponse(
        { message: "Сессия Figma истекла. Подключите аккаунт снова.", authExpired: true },
        401,
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderImportShell();

    const input = await screen.findByPlaceholderText("Вставьте ссылку на Figma-макет");
    await user.type(input, "https://www.figma.com/design/abc123/Demo");
    await user.click(screen.getByRole("button", { name: /загрузить/i }));

    expect(await screen.findByRole("link", { name: /подключить/i })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Сессия Figma истекла");
  });
});
