import { extractFileKeyFromUrl, extractNodeIdFromUrl } from "./mapper";
import type { FigmaAssetUrls, FigmaRawFile, FigmaRawNode, FigmaResolvedFile, FigmaSourceInput } from "./types";

// Серверный клиент Figma API: загрузка файла, ассетов и SVG-рендеров отдельных узлов.
export async function resolveFigmaFile(source: FigmaSourceInput): Promise<FigmaResolvedFile> {
  const fileKey = extractFileKeyFromUrl(source.url);

  if (!fileKey) {
    throw new Error("Не удалось извлечь file key из ссылки Figma.");
  }

  const accessToken = source.accessToken?.trim();

  if (!accessToken) {
    throw new Error("Сначала подключите Figma, затем загрузите макет по ссылке.");
  }

  const url = new URL(`https://api.figma.com/v1/files/${fileKey}`);
  url.searchParams.set("geometry", "paths");

  // Основной запрос к Figma Files API за полной структурой документа.
  const response = await fetch(url, {
    headers: buildFigmaHeaders(accessToken),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await safeReadResponse(response);
    throw new Error(`Figma API вернул ${response.status} ${response.statusText}. ${details}`.trim());
  }

  const payload = (await response.json()) as FigmaRawFile;

  if (!payload.document) {
    throw new Error("Figma API не вернул document для указанного файла.");
  }

  return {
    fileKey,
    fileName: payload.name ?? "Untitled Figma File",
    mode: "live",
    suggestedNodeId: extractNodeIdFromUrl(source.url),
    document: payload.document,
    raw: payload,
    accessToken,
  };
}

export async function fetchFigmaAssetUrls({
  accessToken,
  fileKey,
  node,
}: {
  accessToken?: string;
  fileKey: string;
  node: FigmaRawNode;
}): Promise<FigmaAssetUrls> {
  if (!accessToken) {
    return {
      imageFills: {},
      renderedNodes: {},
    };
  }

  const imageRefs = new Set<string>();
  const renderNodeIds = new Set<string>();

  // Проходим по выбранному поддереву и собираем ссылки на image fills и векторные узлы.
  walkNode(node, (currentNode) => {
    currentNode.fills?.forEach((fill) => {
      if (fill.type === "IMAGE" && fill.imageRef) {
        imageRefs.add(fill.imageRef);
      }
    });

    if (currentNode.id && ["VECTOR", "BOOLEAN_OPERATION", "STAR", "LINE", "ELLIPSE", "POLYGON"].includes(currentNode.type ?? "")) {
      renderNodeIds.add(currentNode.id);
    }
  });

  const [imageFills, renderedNodes] = await Promise.all([
    imageRefs.size > 0 ? fetchImageFillUrls(fileKey, accessToken, [...imageRefs]) : Promise.resolve({}),
    renderNodeIds.size > 0 ? fetchRenderedNodeUrls(fileKey, accessToken, [...renderNodeIds]) : Promise.resolve({}),
  ]);

  return {
    imageFills,
    renderedNodes,
  };
}

async function fetchImageFillUrls(fileKey: string, accessToken: string, imageRefs: string[]) {
  // Вытаскиваем реальные URL для изображений, которые используются как fills.
  const url = new URL(`https://api.figma.com/v1/files/${fileKey}/images`);
  url.searchParams.set("ids", imageRefs.join(","));

  const response = await fetch(url, {
    headers: buildFigmaHeaders(accessToken),
    cache: "no-store",
  });

  if (!response.ok) {
    return {};
  }

  const payload = (await response.json()) as {
    meta?: {
      images?: Record<string, string>;
    };
  };

  return payload.meta?.images ?? {};
}

async function fetchRenderedNodeUrls(fileKey: string, accessToken: string, nodeIds: string[]) {
  // Для векторных узлов запрашиваем SVG-рендер, чтобы потом отрисовать их как img.
  const url = new URL(`https://api.figma.com/v1/images/${fileKey}`);
  url.searchParams.set("ids", nodeIds.join(","));
  url.searchParams.set("format", "svg");
  url.searchParams.set("svg_include_id", "true");

  const response = await fetch(url, {
    headers: buildFigmaHeaders(accessToken),
    cache: "no-store",
  });

  if (!response.ok) {
    return {};
  }

  const payload = (await response.json()) as {
    images?: Record<string, string>;
  };

  return payload.images ?? {};
}

function walkNode(node: FigmaRawNode, visitor: (node: FigmaRawNode) => void) {
  visitor(node);
  node.children?.forEach((child) => walkNode(child, visitor));
}

function buildFigmaHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

async function safeReadResponse(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
