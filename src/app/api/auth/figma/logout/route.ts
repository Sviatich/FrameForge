import { NextResponse } from "next/server";
import { clearSessionCookie, clearStateCookie } from "@/lib/figma/auth";

// Очищает OAuth-сессию и промежуточный state, если пользователь отвязывает Figma-аккаунт.
export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response.cookies);
  clearStateCookie(response.cookies);
  return response;
}
