import { createHash, randomUUID } from "node:crypto";
import type { NextResponse } from "next/server";

// Низкоуровневая OAuth-логика для интеграции с Figma: state, access token, refresh token и cookie.
const SESSION_COOKIE = "transfig_figma_session";
const STATE_COOKIE = "transfig_figma_oauth_state";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const STATE_TTL_MS = 1000 * 60 * 10;
const USE_SECURE_COOKIES = process.env.NODE_ENV === "production";
const DEFAULT_APP_URL = process.env.NODE_ENV === "production" ? "https://frameforge.ru" : "http://localhost:3000";

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

type CookieWriter = {
  set(
    name: string,
    value: string,
    options?: {
      httpOnly?: boolean;
      sameSite?: "lax" | "strict" | "none";
      secure?: boolean;
      path?: string;
      expires?: Date;
      maxAge?: number;
    },
  ): void;
};

type FigmaOAuthTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  user_id?: string;
};

export type FigmaOAuthSession = {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt: number;
  userId?: string;
};

export function getFigmaOAuthConfig(requestUrl?: string, redirectUriOverride?: string) {
  // Все параметры OAuth собраны в одном месте, чтобы не размазывать env-логику по проекту.
  const clientId = process.env.FIGMA_OAUTH_CLIENT_ID;
  const clientSecret = process.env.FIGMA_OAUTH_CLIENT_SECRET;
  const requestOrigin = getRequestOrigin(requestUrl);
  const appUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ?? requestOrigin ?? DEFAULT_APP_URL;
  const configuredRedirectUri = normalizeRedirectUri(process.env.FIGMA_OAUTH_REDIRECT_URI);
  const redirectUri = redirectUriOverride ?? configuredRedirectUri ?? `${appUrl}/api/auth/figma/callback`;
  const scopes = process.env.FIGMA_OAUTH_SCOPES ?? "file_content:read file_metadata:read";

  return {
    clientId,
    clientSecret,
    appUrl,
    redirectUri,
    scopes,
  };
}

export function assertFigmaOAuthConfigured(requestUrl?: string, redirectUriOverride?: string) {
  const config = getFigmaOAuthConfig(requestUrl, redirectUriOverride);

  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    throw new Error("Figma OAuth не настроен. Укажите FIGMA_OAUTH_CLIENT_ID, FIGMA_OAUTH_CLIENT_SECRET и FIGMA_OAUTH_REDIRECT_URI.");
  }

  return {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri,
    appUrl: config.appUrl,
    scopes: config.scopes,
  };
}

export function buildFigmaAuthorizeUrl(requestUrl?: string) {
  const config = assertFigmaOAuthConfigured(requestUrl);
  const state = createOAuthState(config.redirectUri);
  const url = new URL("https://www.figma.com/oauth");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", config.scopes);
  url.searchParams.set("state", state.value);
  url.searchParams.set("response_type", "code");

  return {
    url,
    state,
  };
}

export async function exchangeCodeForSession(code: string, redirectUri?: string) {
  // Первый обмен: одноразовый authorization code превращаем в рабочую OAuth-сессию.
  const config = assertFigmaOAuthConfigured(undefined, redirectUri);
  const body = new URLSearchParams({
    redirect_uri: config.redirectUri,
    code,
    grant_type: "authorization_code",
  });

  const response = await fetch("https://api.figma.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Authorization: buildBasicAuthHeader(config.clientId, config.clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await safeReadText(response);
    throw new Error(`Не удалось завершить OAuth Figma: ${response.status} ${response.statusText}. ${details}`.trim());
  }

  const payload = (await response.json()) as FigmaOAuthTokenResponse;
  return toSession(payload);
}

export async function refreshSession(refreshToken: string) {
  // Обновление access token по refresh token, когда срок действия сессии подходит к концу.
  const config = assertFigmaOAuthConfigured();
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://api.figma.com/v1/oauth/refresh", {
    method: "POST",
    headers: {
      Authorization: buildBasicAuthHeader(config.clientId, config.clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await safeReadText(response);
    throw new Error(`Не удалось обновить OAuth-сессию Figma. ${details}`.trim());
  }

  const payload = (await response.json()) as FigmaOAuthTokenResponse;
  return toSession(payload);
}

export function createOAuthState(redirectUri?: string) {
  // State защищает callback от подмены и привязывает возврат к нашей сессии.
  const nonce = randomUUID();
  const value = `${nonce}.${createHash("sha256").update(nonce).digest("hex")}`;

  return {
    value,
    expiresAt: Date.now() + STATE_TTL_MS,
    redirectUri,
  };
}

export function writeStateCookie(cookieJar: CookieWriter, state: ReturnType<typeof createOAuthState>) {
  cookieJar.set(STATE_COOKIE, encodeValue(state), {
    httpOnly: true,
    sameSite: "lax",
    secure: USE_SECURE_COOKIES,
    path: "/",
    expires: new Date(state.expiresAt),
  });
}

export function validateStateFromCookies(cookieStore: CookieReader, state: string) {
  return Boolean(readOAuthStateFromCookies(cookieStore, state));
}

export function readOAuthStateFromCookies(cookieStore: CookieReader, state: string) {
  const raw = cookieStore.get(STATE_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  const parsed = decodeValue<{ value: string; expiresAt: number; redirectUri?: string }>(raw);

  if (!parsed) {
    return null;
  }

  if (parsed.value !== state || parsed.expiresAt <= Date.now()) {
    return null;
  }

  return parsed;
}

export function clearStateCookie(cookieJar: CookieWriter) {
  cookieJar.set(STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: USE_SECURE_COOKIES,
    path: "/",
    maxAge: 0,
  });
}

export function readSessionFromCookies(cookieStore: CookieReader) {
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  return raw ? decodeValue<FigmaOAuthSession>(raw) : null;
}

export function writeSessionCookie(cookieJar: CookieWriter, session: FigmaOAuthSession) {
  cookieJar.set(SESSION_COOKIE, encodeValue(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: USE_SECURE_COOKIES,
    path: "/",
    expires: new Date(Math.min(session.expiresAt, Date.now() + SESSION_TTL_MS)),
  });
}

export function clearSessionCookie(cookieJar: CookieWriter) {
  cookieJar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: USE_SECURE_COOKIES,
    path: "/",
    maxAge: 0,
  });
}

export async function ensureValidFigmaSession(cookieStore: CookieReader) {
  // Если токен еще жив, просто возвращаем его. Если истекает — пытаемся обновить.
  const session = readSessionFromCookies(cookieStore);

  if (!session) {
    return { session: null, refreshed: null as FigmaOAuthSession | null };
  }

  if (session.expiresAt > Date.now() + 60_000) {
    return { session, refreshed: null as FigmaOAuthSession | null };
  }

  if (!session.refreshToken) {
    return { session: null, refreshed: null as FigmaOAuthSession | null };
  }

  const refreshed = await refreshSession(session.refreshToken);
  return { session: refreshed, refreshed };
}

export function attachSessionCookie(response: NextResponse, session: FigmaOAuthSession | null) {
  if (!session) {
    return response;
  }

  writeSessionCookie(response.cookies, session);
  return response;
}

function toSession(payload: FigmaOAuthTokenResponse): FigmaOAuthSession {
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    tokenType: payload.token_type ?? "Bearer",
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
    userId: payload.user_id,
  };
}

function buildBasicAuthHeader(clientId: string, clientSecret: string) {
  const encoded = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");
  return `Basic ${encoded}`;
}

function getRequestOrigin(requestUrl?: string) {
  if (!requestUrl) {
    return null;
  }

  try {
    const origin = new URL(requestUrl).origin;
    return isLocalOrigin(origin) && process.env.NODE_ENV === "production" ? null : origin;
  } catch {
    return null;
  }
}

function normalizeBaseUrl(value?: string) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\/+$/, "");

  if (process.env.NODE_ENV === "production" && isLocalOrigin(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeRedirectUri(value?: string) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return process.env.NODE_ENV === "production" && isLocalOrigin(url.origin) ? null : value;
  } catch {
    return value;
  }
}

function isLocalOrigin(origin: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

async function safeReadText(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function encodeValue(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeValue<T>(value: string) {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}
