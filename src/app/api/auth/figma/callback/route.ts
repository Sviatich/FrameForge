import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  clearStateCookie,
  exchangeCodeForSession,
  validateStateFromCookies,
  writeSessionCookie,
} from "@/lib/figma/auth";

// OAuth callback: проверяем state, меняем code на токены и сохраняем Figma-сессию.
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return NextResponse.redirect(new URL(`/?figma=error&reason=${encodeURIComponent(error)}`, request.url));
    }

    if (!code || !state || !validateStateFromCookies(cookieStore, state)) {
      return NextResponse.redirect(new URL("/?figma=error&reason=invalid_oauth_state", request.url));
    }

    // Обмениваем одноразовый code на access/refresh token.
    const session = await exchangeCodeForSession(code);
    const response = NextResponse.redirect(new URL("/?figma=connected", request.url));
    clearStateCookie(response.cookies);
    writeSessionCookie(response.cookies, session);
    return response;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "oauth_callback_failed";
    return NextResponse.redirect(new URL(`/?figma=error&reason=${encodeURIComponent(reason)}`, request.url));
  }
}
