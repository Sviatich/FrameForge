import { NextResponse } from "next/server";
import { buildFigmaAuthorizeUrl, writeStateCookie } from "@/lib/figma/auth";

// Стартовая точка OAuth: создаем state, пишем его в cookie и уводим пользователя в Figma.
export async function GET(request: Request) {
  const { url, state } = buildFigmaAuthorizeUrl(request.url);
  const response = NextResponse.redirect(url);
  writeStateCookie(response.cookies, state);
  return response;
}
