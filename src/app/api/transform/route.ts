import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { attachSessionCookie, clearSessionCookie, ensureValidFigmaSession } from "@/lib/figma/auth";
import { FigmaApiError, formatRetryAfter, isFigmaAuthenticationError } from "@/lib/figma/client";
import { transformProjectRequestSchema } from "@/lib/projects/schema";
import { buildProject } from "@/lib/projects/service";

// Запускает основной pipeline трансформации выбранного frame в готовый проект.
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const { session, refreshed } = await ensureValidFigmaSession(cookieStore);
    const json = await request.json();
    const payload = transformProjectRequestSchema.parse(json);
    if (payload.source.kind === "figma-link" && !payload.source.accessToken && !session) {
      return authExpiredResponse();
    }

    // В рабочем сценарии токен подставляется из сохраненной OAuth-сессии.
    const source =
      payload.source.kind === "figma-link" && !payload.source.accessToken
        ? { ...payload.source, accessToken: session?.accessToken }
        : payload.source;

    const project = await buildProject({ ...payload, source });
    return attachSessionCookie(NextResponse.json(project, { status: 201 }), refreshed);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: error.issues[0]?.message ?? "Ошибка валидации запроса.",
        },
        { status: 400 },
      );
    }

    if (error instanceof FigmaApiError) {
      if (isFigmaAuthenticationError(error)) {
        return authExpiredResponse();
      }

      return NextResponse.json(
        {
          message: error.message,
          retryAfterSeconds: error.retryAfterSeconds,
          retryAfterText: error.retryAfterSeconds !== null ? formatRetryAfter(error.retryAfterSeconds) : null,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Не удалось завершить трансформацию.",
      },
      { status: 500 },
    );
  }
}

function authExpiredResponse() {
  const response = NextResponse.json(
    { message: "Сессия Figma истекла. Подключите аккаунт снова.", authExpired: true },
    { status: 401 },
  );
  clearSessionCookie(response.cookies);
  return response;
}
