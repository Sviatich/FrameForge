import { beforeEach, describe, expect, it, vi } from "vitest";
import { FigmaApiError } from "@/lib/figma/client";

const mocks = vi.hoisted(() => ({
  ensureSession: vi.fn(),
  attachCookie: vi.fn((response: Response) => response),
  loadFrames: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: vi.fn(() => Promise.resolve({})) }));
vi.mock("@/lib/figma/auth", () => ({
  ensureValidFigmaSession: mocks.ensureSession,
  attachSessionCookie: mocks.attachCookie,
}));
vi.mock("@/lib/projects/service", () => ({ loadFigmaFrames: mocks.loadFrames }));

import { POST } from "./route";

const validBody = {
  source: { kind: "figma-link", url: "https://figma.com/design/file-key/Demo", accessToken: "" },
};

describe("POST /api/figma/load", () => {
  beforeEach(() => {
    mocks.ensureSession.mockReset();
    mocks.loadFrames.mockReset();
    mocks.attachCookie.mockClear();
  });

  it("returns 401 and clears authorization when there is no session", async () => {
    mocks.ensureSession.mockResolvedValue({ session: null, refreshed: null });

    const response = await POST(jsonRequest(validBody));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ authExpired: true });
    expect(mocks.attachCookie).toHaveBeenCalledWith(expect.any(Response), null);
  });

  it("passes the session token to the Figma service", async () => {
    mocks.ensureSession.mockResolvedValue({ session: { accessToken: "oauth-token" }, refreshed: null });
    mocks.loadFrames.mockResolvedValue({ fileKey: "file-key", fileName: "Demo", mode: "live", frames: [] });

    const response = await POST(jsonRequest(validBody));

    expect(response.status).toBe(200);
    expect(mocks.loadFrames).toHaveBeenCalledWith(expect.objectContaining({ accessToken: "oauth-token" }));
  });

  it("returns rate-limit metadata from Figma", async () => {
    mocks.ensureSession.mockResolvedValue({ session: { accessToken: "oauth-token" }, refreshed: null });
    mocks.loadFrames.mockRejectedValue(
      new FigmaApiError(new Response(null, { status: 429, headers: { "retry-after": "120" } }), "limit"),
    );

    const response = await POST(jsonRequest(validBody));

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({ retryAfterSeconds: 120, retryAfterText: "2 минуты" });
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/figma/load", { method: "POST", body: JSON.stringify(body) });
}
