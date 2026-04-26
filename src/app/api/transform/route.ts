import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { attachSessionCookie, ensureValidFigmaSession } from "@/lib/figma/auth";
import { transformProjectRequestSchema } from "@/lib/projects/schema";
import { buildProject } from "@/lib/projects/service";

// Запускает основной pipeline трансформации выбранного frame в готовый проект.
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const { session, refreshed } = await ensureValidFigmaSession(cookieStore);
    const json = await request.json();
    const payload = transformProjectRequestSchema.parse(json);
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

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Не удалось завершить трансформацию.",
      },
      { status: 500 },
    );
  }
}
