import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { buildLocalizedProjectArchive } from "@/lib/core/exporter";
import { generatedFileSchema } from "@/lib/projects/schema";

const localExportRequestSchema = z.object({
  projectName: z.string().trim().min(1).default("generated-project"),
  files: z.array(generatedFileSchema),
});

// Собирает ZIP из текущего клиентского проекта без сохранения его на сервере.
export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = localExportRequestSchema.parse(json);
    const body = await buildLocalizedProjectArchive(payload.files);
    const downloadName = `${payload.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "generated-project"}.zip`;

    return new Response(body, {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${downloadName}"`,
        "cache-control": "no-store",
      },
    });
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
        message: error instanceof Error ? error.message : "Не удалось собрать ZIP-архив.",
      },
      { status: 500 },
    );
  }
}
