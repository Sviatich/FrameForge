import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { attachSessionCookie, clearSessionCookie, ensureValidFigmaSession } from "@/lib/figma/auth";

// Возвращает текущее состояние Figma-сессии для клиентского UI.
export async function GET() {
  const cookieStore = await cookies();
  const { session, refreshed } = await ensureValidFigmaSession(cookieStore);
  const response = NextResponse.json({
    connected: Boolean(session),
    expiresAt: session?.expiresAt ?? null,
    userId: session?.userId ?? null,
  });

  if (!session) {
    clearSessionCookie(response.cookies);
    return response;
  }

  return attachSessionCookie(response, refreshed);
}
