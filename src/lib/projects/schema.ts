import { z } from "zod";

// Zod-схемы описывают внешний контракт между UI, API и слоем хранения проектов.
export const figmaSourceSchema = z.object({
  kind: z.literal("figma-link"),
  url: z.string().trim().min(1, "Вставьте ссылку на макет Figma."),
  accessToken: z.string().trim().optional().or(z.literal("")),
});

export const loadFigmaRequestSchema = z.object({
  source: figmaSourceSchema,
});

export const transformProjectRequestSchema = z.object({
  selectedNodeId: z.string().trim().min(1, "Выберите frame для трансформации."),
  source: figmaSourceSchema,
});

export const frameOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  depth: z.number(),
  hasAutoLayout: z.boolean().optional().default(false),
});

export const generatedFileSchema = z.object({
  path: z.string(),
  language: z.enum(["html", "tsx", "ts", "css", "json", "md"]),
  content: z.string(),
});

export const projectRecordSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  name: z.string(),
  status: z.enum(["ready"]),
  sourceMode: z.enum(["live"]),
  fileKey: z.string(),
  fileName: z.string(),
  selectedNodeId: z.string(),
  selectedNodeName: z.string(),
  selectedNodeWidth: z.number().nullable().optional(),
  summary: z.string(),
  previewHtml: z.string(),
  generatedAt: z.string(),
  entryFilePath: z.string(),
  files: z.array(generatedFileSchema),
  availableFrames: z.array(frameOptionSchema),
});

export const loadFigmaResponseSchema = z.object({
  fileKey: z.string(),
  fileName: z.string(),
  mode: z.enum(["live"]),
  suggestedNodeId: z.string().optional(),
  frames: z.array(frameOptionSchema),
});

export type FigmaSourceDto = z.infer<typeof figmaSourceSchema>;
export type TransformProjectRequest = z.infer<typeof transformProjectRequestSchema>;
export type ProjectRecord = z.infer<typeof projectRecordSchema>;
