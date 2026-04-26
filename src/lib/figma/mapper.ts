import type { FigmaFrameOption, FigmaRawNode } from "./types";

// Вспомогательный слой над Figma-данными: разбор ссылок, поиск узлов и сбор frame для выбора.
const FIGMA_URL_PATTERN = /figma\.com\/(?:design|file)\/([^/?]+)/i;

export function extractFileKeyFromUrl(url: string) {
  const match = url.match(FIGMA_URL_PATTERN);
  return match?.[1] ?? "";
}

export function extractNodeIdFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const value = parsed.searchParams.get("node-id");

    if (!value) {
      return "";
    }

    return value.replaceAll("-", ":");
  } catch {
    return "";
  }
}

export function collectFrameOptions(root: FigmaRawNode): FigmaFrameOption[] {
  // На UI показываем только верхнеуровневые композиции, а не все вложенные узлы подряд.
  const topLevelNodes =
    root.children?.flatMap((child) => {
      if (child.type === "CANVAS") {
        return child.children ?? [];
      }

      return [child];
    }) ?? [];

  return topLevelNodes.flatMap((node) => {
    const nodeType = node.type ?? "UNKNOWN";

    if (!["FRAME", "SECTION", "COMPONENT", "INSTANCE"].includes(nodeType) || !node.id) {
      return [];
    }

    return [
      {
        id: node.id,
        name: node.name ?? "Untitled",
        type: nodeType,
        depth: 0,
        hasAutoLayout: hasAutoLayout(node),
      },
    ];
  });
}

export function findNodeById(root: FigmaRawNode, nodeId: string): FigmaRawNode | null {
  let result: FigmaRawNode | null = null;

  walkTree(root, (node) => {
    if (result || node.id !== nodeId) {
      return;
    }

    result = node;
  });

  return result;
}

function walkTree(node: FigmaRawNode, visitor: (node: FigmaRawNode, depth: number) => void, depth = 0) {
  visitor(node, depth);
  node.children?.forEach((child) => walkTree(child, visitor, depth + 1));
}

function hasAutoLayout(node: FigmaRawNode): boolean {
  // Пометка нужна для UI-подсказки: макеты с Auto Layout обычно трансформируются стабильнее.
  if (node.layoutMode && node.layoutMode !== "NONE") {
    return true;
  }

  return node.children?.some((child) => hasAutoLayout(child)) ?? false;
}
