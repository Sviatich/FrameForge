import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureSession: vi.fn(),
  attachCookie: vi.fn((response: Response) => response),
  buildProject: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: vi.fn(() => Promise.resolve({})) }));
vi.mock("@/lib/figma/auth", () => ({
  ensureValidFigmaSession: mocks.ensureSession,
  attachSessionCookie: mocks.attachCookie,
}));
vi.mock("@/lib/projects/service", () => ({ buildProject: mocks.buildProject }));

import { POST } from "./route";

describe("POST /api/transform", () => {
  beforeEach(() => {
    mocks.ensureSession.mockReset();
    mocks.buildProject.mockReset();
    mocks.attachCookie.mockClear();
  });

  it("returns 400 when a frame is not selected", async () => {
    mocks.ensureSession.mockResolvedValue({ session: { accessToken: "token" }, refreshed: null });
    const response = await POST(
      jsonRequest({
        selectedNodeId: "",
        source: { kind: "figma-link", url: "https://figma.com/design/file-key/Demo", accessToken: "" },
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns the generated project with status 201", async () => {
    mocks.ensureSession.mockResolvedValue({ session: { accessToken: "token" }, refreshed: null });
    mocks.buildProject.mockResolvedValue({ id: "project-1", status: "ready" });
    const response = await POST(
      jsonRequest({
        selectedNodeId: "1:1",
        source: { kind: "figma-link", url: "https://figma.com/design/file-key/Demo", accessToken: "" },
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ id: "project-1", status: "ready" });
    expect(mocks.buildProject).toHaveBeenCalledWith(
      expect.objectContaining({ source: expect.objectContaining({ accessToken: "token" }) }),
    );
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/transform", { method: "POST", body: JSON.stringify(body) });
}
