import { extractFileKeyFromUrl, extractNodeIdFromUrl } from "./mapper";
import type { FigmaAssetUrls, FigmaRawFile, FigmaRawNode, FigmaResolvedFile, FigmaSourceInput } from "./types";

export class FigmaApiError extends Error {
  status: number;
  statusText: string;
  retryAfterSeconds: number | null;
  details: string;

  constructor(response: Response, details: string) {
    const retryAfterSeconds = parseRetryAfter(response.headers.get("retry-after"));
    const message =
      response.status === 429
        ? buildRateLimitMessage(retryAfterSeconds)
        : `Figma API вернул ${response.status} ${response.statusText}. ${details}`.trim();

    super(message);

    this.name = "FigmaApiError";
    this.status = response.status;
    this.statusText = response.statusText;
    this.retryAfterSeconds = retryAfterSeconds;
    this.details = details;
  }
}

export function isFigmaAuthenticationError(error: FigmaApiError) {
  return error.status === 401 || /invalid[ _-]?(access[ _-]?)?token|token.+(?:expired|revoked)/i.test(error.details);
}

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
    throw new FigmaApiError(response, details);
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

function parseRetryAfter(value: string | null) {
  if (!value) {
    return null;
  }

  const seconds = Number(value);

  if (Number.isFinite(seconds)) {
    return Math.max(0, Math.ceil(seconds));
  }

  const retryAt = Date.parse(value);

  if (Number.isNaN(retryAt)) {
    return null;
  }

  return Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
}

function buildRateLimitMessage(retryAfterSeconds: number | null) {
  const waitMessage =
    retryAfterSeconds !== null
      ? `Подождите ${formatRetryAfter(retryAfterSeconds)} и попробуйте снова.`
      : "Figma не передала точное время ожидания, попробуйте снова через несколько минут.";

  return `Лимит запросов к Figma на вашем аккаунте исчерпан. Смените аккаунт, тарифный план или подождите. ${waitMessage}`;
}

export function formatRetryAfter(seconds: number) {
  if (seconds < 60) {
    return formatRuUnit(seconds, "секунду", "секунды", "секунд");
  }

  const minutes = Math.ceil(seconds / 60);

  if (minutes < 60) {
    return formatRuUnit(minutes, "минуту", "минуты", "минут");
  }

  const hours = Math.ceil(minutes / 60);

  return formatRuUnit(hours, "час", "часа", "часов");
}

function formatRuUnit(value: number, one: string, few: string, many: string) {
  const normalized = Math.abs(value);
  const lastTwo = normalized % 100;
  const last = normalized % 10;
  const unit = lastTwo >= 11 && lastTwo <= 14 ? many : last === 1 ? one : last >= 2 && last <= 4 ? few : many;

  return `${value} ${unit}`;
}
