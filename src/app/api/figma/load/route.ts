import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { attachSessionCookie, ensureValidFigmaSession } from "@/lib/figma/auth";
import { loadFigmaRequestSchema } from "@/lib/projects/schema";
import { loadFigmaFrames } from "@/lib/projects/service";

// Загружает структуру Figma-файла и отдает список доступных frame для выбора.
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const { session, refreshed } = await ensureValidFigmaSession(cookieStore);
    const json = await request.json();
    const payload = loadFigmaRequestSchema.parse(json);
    // Если токен явно не передан, берем его из OAuth-сессии.
    const source =
      payload.source.kind === "figma-link" && !payload.source.accessToken
        ? { ...payload.source, accessToken: session?.accessToken }
        : payload.source;

    const result = await loadFigmaFrames(source);
    return attachSessionCookie(NextResponse.json(result), refreshed);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: error.issues[0]?.message ?? "Ошибка валидации запроса.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Не удалось загрузить Figma-файл.",
      },
      { status: 500 },
    );
  }
}
