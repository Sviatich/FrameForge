import { fetchFigmaAssetUrls, resolveFigmaFile } from "@/lib/figma/client";
import { findNodeById } from "@/lib/figma/mapper";
import type { FigmaSourceInput } from "@/lib/figma/types";
import { generateProjectArtifacts } from "./generator";
import { parseFigmaNode } from "./parser";
import { transformNode } from "./transformer";

// Центральный оркестратор: связывает интеграцию с Figma, parser, transformer и generator.
type RunPipelineParams = {
  source: FigmaSourceInput;
  selectedNodeId: string;
};

export async function runTransformationPipeline({ source, selectedNodeId }: RunPipelineParams) {
  // Оркестратор удерживает главный сценарий трансляции в одном месте.
  const resolvedFile = await resolveFigmaFile(source);
  const sourceNode = findNodeById(resolvedFile.document, selectedNodeId);

  if (!sourceNode) {
    throw new Error("Выбранный frame не найден в структуре Figma-файла.");
  }

  const assetUrls = await fetchFigmaAssetUrls({
    accessToken: resolvedFile.accessToken,
    fileKey: resolvedFile.fileKey,
    node: sourceNode,
  });

  const parsedNode = parseFigmaNode(sourceNode, assetUrls);

  if (!parsedNode) {
    throw new Error("Выбранный узел скрыт в Figma и не может быть отрисован.");
  }

  const transformedNode = transformNode(parsedNode);

  return {
    resolvedFile,
    parsedNode,
    transformedNode,
    // Финальный шаг — превращаем семантическое дерево в набор файлов и HTML preview.
    generatedArtifacts: generateProjectArtifacts({
      projectName: resolvedFile.fileName,
      mode: resolvedFile.mode,
      nodeTree: transformedNode,
    }),
  };
}
