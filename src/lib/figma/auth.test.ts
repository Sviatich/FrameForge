import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  attachSessionCookie,
  assertFigmaOAuthConfigured,
  buildFigmaAuthorizeUrl,
  createOAuthState,
  ensureValidFigmaSession,
  exchangeCodeForSession,
  readSessionFromCookies,
  readOAuthStateFromCookies,
  refreshSession,
  validateStateFromCookies,
  writeSessionCookie,
  writeStateCookie,
  type FigmaOAuthSession,
} from "./auth";
import { NextResponse } from "next/server";

type CookieRecord = { value: string };

function createCookieJar() {
  const values = new Map<string, CookieRecord>();

  return {
    values,
    get: (name: string) => values.get(name),
    set: vi.fn((name: string, value: string) => values.set(name, { value })),
  };
}

describe("Figma OAuth session", () => {
  beforeEach(() => {
    process.env.FIGMA_OAUTH_CLIENT_ID = "client-id";
    process.env.FIGMA_OAUTH_CLIENT_SECRET = "client-secret";
    process.env.FIGMA_OAUTH_REDIRECT_URI = "http://localhost:3000/api/auth/figma/callback";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips an OAuth session through the cookie", () => {
    const jar = createCookieJar();
    const session: FigmaOAuthSession = {
      accessToken: "access",
      refreshToken: "refresh",
      tokenType: "Bearer",
      expiresAt: Date.now() + 3_600_000,
      userId: "user-1",
    };

    writeSessionCookie(jar, session);

    expect(readSessionFromCookies(jar)).toEqual(session);
    expect(jar.set).toHaveBeenCalledWith(
      "transfig_figma_session",
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
    );
  });

  it("builds an authorization URL and validates the anti-forgery state", () => {
    const { url, state } = buildFigmaAuthorizeUrl("http://localhost:3000");
    const jar = createCookieJar();
    writeStateCookie(jar, state);

    expect(url.origin).toBe("https://www.figma.com");
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(validateStateFromCookies(jar, state.value)).toBe(true);
    expect(validateStateFromCookies(jar, "forged-state")).toBe(false);
    expect(readOAuthStateFromCookies(jar, state.value)?.redirectUri).toBe(
      "http://localhost:3000/api/auth/figma/callback",
    );
  });

  it("rejects an expired OAuth state", () => {
    const jar = createCookieJar();
    const state = createOAuthState();
    writeStateCookie(jar, { ...state, expiresAt: Date.now() - 1 });

    expect(validateStateFromCookies(jar, state.value)).toBe(false);
  });

  it("exchanges an authorization code for a session", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            access_token: "access-from-code",
            refresh_token: "refresh-from-code",
            expires_in: 1800,
            user_id: "user-2",
          }),
        ),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const session = await exchangeCodeForSession("one-time-code");

    expect(session).toMatchObject({
      accessToken: "access-from-code",
      refreshToken: "refresh-from-code",
      userId: "user-2",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.figma.com/v1/oauth/token",
      expect.objectContaining({ method: "POST", cache: "no-store" }),
    );
  });

  it("fails fast when OAuth credentials are missing", () => {
    delete process.env.FIGMA_OAUTH_CLIENT_SECRET;

    expect(() => assertFigmaOAuthConfigured()).toThrow("Figma OAuth не настроен");
  });

  it("keeps a session whose access token is still valid", async () => {
    const jar = createCookieJar();
    const session: FigmaOAuthSession = {
      accessToken: "access",
      refreshToken: "refresh",
      tokenType: "Bearer",
      expiresAt: Date.now() + 3_600_000,
    };
    writeSessionCookie(jar, session);

    await expect(ensureValidFigmaSession(jar)).resolves.toEqual({ session, refreshed: null });
  });

  it("does not clear a valid cookie when no refresh was needed", () => {
    const response = NextResponse.json({ connected: true });

    attachSessionCookie(response, null);

    expect(response.cookies.get("transfig_figma_session")).toBeUndefined();
  });

  it("refreshes an expiring session and retains the refresh token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ access_token: "new-access", expires_in: 3600, token_type: "Bearer" })),
        ),
      ),
    );
    const refreshed = await refreshSession("existing-refresh");

    expect(refreshed.accessToken).toBe("new-access");
    expect(refreshed.refreshToken).toBe("existing-refresh");
  });

  it("ends the session when refresh is rejected", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("invalid_grant", { status: 400 }))));
    const jar = createCookieJar();
    writeSessionCookie(jar, {
      accessToken: "expired",
      refreshToken: "revoked",
      tokenType: "Bearer",
      expiresAt: Date.now() - 1,
    });

    await expect(ensureValidFigmaSession(jar)).resolves.toEqual({ session: null, refreshed: null });
  });
});
