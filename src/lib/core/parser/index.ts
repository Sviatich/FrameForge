import type { FigmaAssetUrls, FigmaRawColor, FigmaRawEffect, FigmaRawFill, FigmaRawNode, FigmaRawVector } from "@/lib/figma/types";
import type { ParsedNode } from "../types";

// Parser переводит сырой Figma JSON в нормализованную внутреннюю модель ParsedNode.
export function parseFigmaNode(
  node: FigmaRawNode,
  assetUrls?: FigmaAssetUrls,
  parentOrigin?: {
    x: number;
    y: number;
    width: number | null;
    height: number | null;
  },
): ParsedNode | null {
  // Parser переводит сырой узел Figma в компактную внутреннюю модель.
  if (node.visible === false) {
    return null;
  }

  const absoluteX = node.absoluteBoundingBox?.x ?? null;
  const absoluteY = node.absoluteBoundingBox?.y ?? null;
  const relativeX = absoluteX !== null ? absoluteX - (parentOrigin?.x ?? absoluteX) : null;
  const relativeY = absoluteY !== null ? absoluteY - (parentOrigin?.y ?? absoluteY) : null;

  const parsedChildren =
    node.children
      ?.map((child) =>
        parseFigmaNode(child, assetUrls, {
          x: absoluteX ?? 0,
          y: absoluteY ?? 0,
          width: node.absoluteBoundingBox?.width ?? null,
          height: node.absoluteBoundingBox?.height ?? null,
        }),
      )
      .filter((child): child is ParsedNode => child !== null) ?? [];
  const parsedEffects = extractEffects(node.effects);
  const parsedTransform = extractTransform(node);
  const width = node.absoluteBoundingBox?.width ?? null;
  const height = node.absoluteBoundingBox?.height ?? null;
  const parentWidth = parentOrigin?.width ?? null;
  const parentHeight = parentOrigin?.height ?? null;
  const right = parentWidth !== null && relativeX !== null && width !== null ? parentWidth - relativeX - width : null;
  const bottom = parentHeight !== null && relativeY !== null && height !== null ? parentHeight - relativeY - height : null;
  const centerOffsetX =
    parentWidth !== null && relativeX !== null && width !== null ? relativeX + width / 2 - parentWidth / 2 : null;
  const centerOffsetY =
    parentHeight !== null && relativeY !== null && height !== null ? relativeY + height / 2 - parentHeight / 2 : null;

  // На этом уровне собираем все, что нужно дальше transformer-у:
  // текст, фон, бордеры, ассеты, эффекты, layout, constraints и дочерние узлы.
  return {
    id: node.id ?? crypto.randomUUID(),
    name: node.name ?? "Без названия",
    type: node.type ?? "UNKNOWN",
    textContent: node.characters ?? "",
    x: relativeX,
    y: relativeY,
    width,
    height,
    fontFamily: node.style?.fontFamily ?? null,
    fontSize: node.style?.fontSize ?? null,
    fontWeight: node.style?.fontWeight ?? null,
    lineHeight: node.style?.lineHeightPx ?? inferLineHeight(node.style?.fontSize, node.style?.lineHeightPercentFontSize),
    lineHeightPercentFontSize: node.style?.lineHeightPercentFontSize ?? null,
    letterSpacing: node.style?.letterSpacing ?? null,
    textTransform: mapTextCase(node.style?.textCase),
    textDecoration: mapTextDecoration(node.style?.textDecoration),
    textAlign: mapTextAlign(node.style?.textAlignHorizontal),
    paragraphSpacing: node.style?.paragraphSpacing ?? null,
    paragraphIndent: node.style?.paragraphIndent ?? null,
    listSpacing: node.style?.listSpacing ?? null,
    textAutoResize: mapTextAutoResize(node.style?.textAutoResize),
    textTruncation: mapTextTruncation(node.style?.textTruncation),
    maxLines: node.style?.maxLines ?? null,
    // Блок текстовых характеристик: цвет, размер, line-height, spacing и правила переноса.
    textColor: extractTextColor(node),
    cornerRadius: node.cornerRadius ?? null,
    cornerRadii: extractCornerRadii(node),
    // Блок визуального оформления контейнера: фон, градиенты, бордеры и изображения.
    backgroundColor: extractBackgroundColor(node),
    backgroundGradient: extractBackgroundGradient(node),
    borderColor: extractBorderColor(node),
    borderWidth: node.strokeWeight ?? null,
    borderSides: extractBorderSides(node),
    backgroundImageUrl: extractBackgroundImageUrl(node, assetUrls),
    backgroundSize: extractBackgroundSize(node),
    backgroundRepeat: extractBackgroundRepeat(node),
    backgroundPosition: extractBackgroundPosition(node),
    assetUrl: extractAssetUrl(node, assetUrls),
    assetFit: extractAssetFit(node),
    // Эффекты слоя: прозрачность, тени и blur.
    opacity: node.opacity ?? null,
    boxShadow: parsedEffects.boxShadow,
    textShadow: parsedEffects.textShadow,
    layerBlur: parsedEffects.layerBlur,
    backgroundBlur: parsedEffects.backgroundBlur,
    parentWidth,
    parentHeight,
    right,
    bottom,
    centerOffsetX,
    centerOffsetY,
    // Ограничения и трансформации нужны для абсолютного позиционирования в итоговом CSS.
    constraints: extractConstraints(node),
    rotation: parsedTransform.rotation,
    scaleX: parsedTransform.scaleX,
    scaleY: parsedTransform.scaleY,
    // Метаданные компонентов Figma помогают точнее распознавать кнопки, ссылки и reusable-узлы.
    componentMeta: extractComponentMeta(node),
    layoutGrow: node.layoutGrow ?? 0,
    layoutAlign: mapLayoutAlign(node.layoutAlign),
    layoutPositioning: mapLayoutPositioning(node.layoutPositioning),
    layout: {
      mode: mapLayoutMode(node.layoutMode),
      wrap: mapLayoutWrap(node.layoutWrap),
      gap: node.itemSpacing ?? 0,
      padding: [node.paddingTop ?? 0, node.paddingRight ?? 0, node.paddingBottom ?? 0, node.paddingLeft ?? 0],
      primaryAxisAlign: mapPrimaryAxisAlign(node.primaryAxisAlignItems),
      counterAxisAlign: mapCounterAxisAlign(node.counterAxisAlignItems),
      primaryAxisSizing: mapSizingMode(node.primaryAxisSizingMode),
      counterAxisSizing: mapSizingMode(node.counterAxisSizingMode),
    },
    effectsCount: node.effects?.length ?? 0,
    children: parsedChildren,
  };
}

function mapLayoutMode(value: FigmaRawNode["layoutMode"]): ParsedNode["layout"]["mode"] {
  if (value === "HORIZONTAL") {
    return "row";
  }

  if (value === "VERTICAL") {
    return "column";
  }

  return "none";
}

function mapLayoutWrap(value: FigmaRawNode["layoutWrap"]): ParsedNode["layout"]["wrap"] {
  return value === "WRAP" ? "wrap" : "nowrap";
}

function mapPrimaryAxisAlign(value?: string | null): ParsedNode["layout"]["primaryAxisAlign"] {
  switch (value) {
    case "CENTER":
      return "center";
    case "MAX":
      return "end";
    case "SPACE_BETWEEN":
      return "space-between";
    default:
      return "start";
  }
}

function mapCounterAxisAlign(value?: string | null): ParsedNode["layout"]["counterAxisAlign"] {
  switch (value) {
    case "CENTER":
      return "center";
    case "MAX":
      return "end";
    case "STRETCH":
    case "BASELINE":
      return "stretch";
    default:
      return "start";
  }
}

function mapSizingMode(value?: "FIXED" | "AUTO" | null): ParsedNode["layout"]["primaryAxisSizing"] {
  return value === "AUTO" ? "auto" : "fixed";
}

function mapTextAutoResize(value?: string | null): ParsedNode["textAutoResize"] {
  switch (value) {
    case "WIDTH_AND_HEIGHT":
      return "width-and-height";
    case "HEIGHT":
      return "height";
    case "TRUNCATE":
      return "truncate";
    case "NONE":
      return "none";
    default:
      return null;
  }
}

function mapTextTruncation(value?: string | null): ParsedNode["textTruncation"] {
  switch (value) {
    case "ENDING":
      return "ending";
    case "DISABLED":
      return "disabled";
    default:
      return null;
  }
}

function mapLayoutAlign(value?: string | null): ParsedNode["layoutAlign"] {
  switch (value) {
    case "MIN":
      return "start";
    case "CENTER":
      return "center";
    case "MAX":
      return "end";
    case "STRETCH":
      return "stretch";
    case "INHERIT":
      return "inherit";
    default:
      return null;
  }
}

function mapLayoutPositioning(value?: "AUTO" | "ABSOLUTE" | null): ParsedNode["layoutPositioning"] {
  return value === "ABSOLUTE" ? "absolute" : "auto";
}

function extractBackgroundColor(node: FigmaRawNode) {
  // Ищем базовый фоновый цвет контейнера. Для TEXT-узлов фон нам не нужен.
  if (node.type === "TEXT") {
    return null;
  }

  const fill = node.fills?.find((item) => item.type === "SOLID" && item.visible !== false);
  const fillColor = fill?.color ?? node.backgroundColor;

  return fillColor ? toCssColor(fillColor, fill?.opacity) : null;
}

function inferLineHeight(fontSize?: number | null, lineHeightPercentFontSize?: number | null) {
  if (!fontSize || !lineHeightPercentFontSize) {
    return null;
  }

  return (fontSize * lineHeightPercentFontSize) / 100;
}

function extractCornerRadii(node: FigmaRawNode): ParsedNode["cornerRadii"] {
  const radii = node.rectangleCornerRadii;

  if (!radii || radii.length !== 4) {
    return null;
  }

  return [radii[0] ?? 0, radii[1] ?? 0, radii[2] ?? 0, radii[3] ?? 0];
}

function extractBackgroundGradient(node: FigmaRawNode) {
  // Здесь ищем gradient fill и сразу переводим его в CSS-представление.
  if (node.type === "TEXT") {
    return null;
  }

  const fill = node.fills?.find(
    (item) =>
      item.visible !== false &&
      ["GRADIENT_LINEAR", "GRADIENT_RADIAL", "GRADIENT_ANGULAR", "GRADIENT_DIAMOND"].includes(item.type ?? ""),
  );

  if (!fill) {
    return null;
  }

  const stops = fill.gradientStops
    ?.map((stop) => {
      if (!stop.color) {
        return null;
      }

      const color = toCssColor(stop.color, fill.opacity);
      const position = `${Math.round((stop.position ?? 0) * 100)}%`;
      return `${color} ${position}`;
    })
    .filter((stop): stop is string => stop !== null);

  if (!stops || stops.length === 0) {
    return null;
  }

  switch (fill.type) {
    case "GRADIENT_LINEAR":
      return `linear-gradient(${getLinearGradientAngle(fill.gradientHandlePositions)}deg, ${stops.join(", ")})`;
    case "GRADIENT_RADIAL":
      return `radial-gradient(circle at ${getRadialGradientCenter(fill.gradientHandlePositions)}, ${stops.join(", ")})`;
    case "GRADIENT_ANGULAR":
      return `conic-gradient(from ${getLinearGradientAngle(fill.gradientHandlePositions)}deg at ${getRadialGradientCenter(fill.gradientHandlePositions)}, ${stops.join(", ")})`;
    case "GRADIENT_DIAMOND":
      return `radial-gradient(circle at ${getRadialGradientCenter(fill.gradientHandlePositions)}, ${stops.join(", ")})`;
    default:
      return null;
  }
}

function extractTextColor(node: FigmaRawNode) {
  // Для текста читаем первый видимый SOLID fill как основной цвет шрифта.
  const fillColor = node.fills?.find((fill) => fill.type === "SOLID" && fill.visible !== false)?.color;
  return fillColor ? toCssColor(fillColor) : null;
}

function extractBorderColor(node: FigmaRawNode) {
  // Для бордера используем первый видимый SOLID stroke.
  const stroke = node.strokes?.find((item) => item.type === "SOLID" && item.visible !== false);
  return stroke?.color ? toCssColor(stroke.color, stroke.opacity) : null;
}

function extractBorderSides(node: FigmaRawNode): ParsedNode["borderSides"] {
  const weights = node.individualStrokeWeights;

  if (!weights) {
    return null;
  }

  return {
    top: weights.top ?? 0,
    right: weights.right ?? 0,
    bottom: weights.bottom ?? 0,
    left: weights.left ?? 0,
  };
}

function extractAssetUrl(node: FigmaRawNode, assetUrls?: FigmaAssetUrls) {
  // Сначала пробуем image fill, затем fallback на SVG-рендер векторного узла.
  const imageRef = node.fills?.find((fill) => fill.type === "IMAGE" && fill.imageRef)?.imageRef;

  if (imageRef && assetUrls?.imageFills[imageRef]) {
    return assetUrls.imageFills[imageRef];
  }

  if (node.id && assetUrls?.renderedNodes[node.id]) {
    return assetUrls.renderedNodes[node.id];
  }

  return null;
}

function extractBackgroundImageUrl(node: FigmaRawNode, assetUrls?: FigmaAssetUrls) {
  // Отдельно поддерживаем случай, когда картинка используется именно как background.
  const imageRef = node.fills?.find((fill) => fill.type === "IMAGE" && fill.visible !== false && fill.imageRef)?.imageRef;

  if (!imageRef) {
    return null;
  }

  return assetUrls?.imageFills[imageRef] ?? null;
}

function extractBackgroundSize(node: FigmaRawNode): ParsedNode["backgroundSize"] {
  const imageFill = node.fills?.find((fill) => fill.type === "IMAGE" && fill.visible !== false);

  switch (imageFill?.scaleMode) {
    case "FIT":
      return "contain";
    case "STRETCH":
      return "100% 100%";
    case "TILE":
      return tileBackgroundSize(imageFill);
    case "FILL":
    default:
      return imageFill ? "cover" : null;
  }
}

function extractBackgroundRepeat(node: FigmaRawNode): ParsedNode["backgroundRepeat"] {
  const imageFill = node.fills?.find((fill) => fill.type === "IMAGE" && fill.visible !== false);

  if (!imageFill) {
    return null;
  }

  return imageFill.scaleMode === "TILE" ? "repeat" : "no-repeat";
}

function extractBackgroundPosition(node: FigmaRawNode): ParsedNode["backgroundPosition"] {
  const imageFill = node.fills?.find((fill) => fill.type === "IMAGE" && fill.visible !== false);

  if (!imageFill) {
    return null;
  }

  return imageFill.scaleMode === "TILE" ? "top left" : "center";
}

function extractAssetFit(node: FigmaRawNode): ParsedNode["assetFit"] {
  const imageFill = node.fills?.find((fill) => fill.type === "IMAGE" && fill.visible !== false);

  switch (imageFill?.scaleMode) {
    case "FILL":
      return "cover";
    case "FIT":
      return "contain";
    case "STRETCH":
      return "fill";
    default:
      return null;
  }
}

function extractConstraints(node: FigmaRawNode): ParsedNode["constraints"] {
  // Constraints нужны, чтобы восстановить поведение абсолютных элементов внутри контейнера.
  const horizontal = mapConstraintAxis(node.constraints?.horizontal);
  const vertical = mapConstraintAxis(node.constraints?.vertical);

  if (!horizontal && !vertical) {
    return null;
  }

  return {
    horizontal: horizontal ?? "start",
    vertical: vertical ?? "start",
  };
}

function extractComponentMeta(node: FigmaRawNode): ParsedNode["componentMeta"] {
  // Сохраняем информацию о component/instance, чтобы transformer мог использовать ее в эвристиках.
  if (!["COMPONENT", "INSTANCE", "COMPONENT_SET"].includes(node.type ?? "")) {
    return null;
  }

  const kind =
    node.type === "COMPONENT"
      ? "component"
      : node.type === "INSTANCE"
        ? "instance"
        : "component-set";

  return {
    kind,
    componentId: node.componentId ?? null,
    componentKey: node.mainComponent?.key ?? null,
    componentName: node.mainComponent?.name ?? null,
    componentSetId: node.mainComponent?.componentSetId ?? null,
    propertyKeys: [
      ...Object.keys(node.componentProperties ?? {}),
      ...Object.keys(node.componentPropertyDefinitions ?? {}),
    ].filter((value, index, items) => items.indexOf(value) === index),
  };
}

function extractTransform(node: FigmaRawNode) {
  // Rotation и scale вытаскиваем из матрицы трансформации, если Figma не дала их напрямую.
  const explicitRotation = parseRotation(node.rotation);
  const matrix = node.relativeTransform;

  if (!matrix || matrix.length < 2) {
    return {
      rotation: explicitRotation,
      scaleX: null,
      scaleY: null,
    };
  }

  const [[a, c], [b, d]] = matrix;
  const scaleX = Math.sqrt(a * a + b * b);
  const scaleY = Math.sqrt(c * c + d * d);
  const matrixRotation = (Math.atan2(b, a) * 180) / Math.PI;
  const rotation = explicitRotation ?? normalizeDegrees(matrixRotation);

  return {
    rotation,
    scaleX: isUnitLike(scaleX) ? null : roundTransformValue(scaleX),
    scaleY: isUnitLike(scaleY) ? null : roundTransformValue(scaleY),
  };
}

function extractEffects(effects?: FigmaRawEffect[]) {
  // Здесь парсим drop shadow, inner shadow и blur-эффекты в CSS-вид.
  const visibleEffects = effects?.filter((effect) => effect.visible !== false) ?? [];
  const boxShadowParts: string[] = [];
  const textShadowParts: string[] = [];
  let layerBlur: number | null = null;
  let backgroundBlur: number | null = null;

  visibleEffects.forEach((effect) => {
    switch (effect.type) {
      case "DROP_SHADOW": {
        const shadow = toShadowValue(effect, false);

        if (shadow) {
          boxShadowParts.push(shadow);
          textShadowParts.push(toTextShadowValue(effect));
        }

        break;
      }
      case "INNER_SHADOW": {
        const shadow = toShadowValue(effect, true);

        if (shadow) {
          boxShadowParts.push(shadow);
        }

        break;
      }
      case "LAYER_BLUR":
        layerBlur = maxEffectRadius(layerBlur, effect.radius);
        break;
      case "BACKGROUND_BLUR":
        backgroundBlur = maxEffectRadius(backgroundBlur, effect.radius);
        break;
      default:
        break;
    }
  });

  return {
    boxShadow: boxShadowParts.length > 0 ? boxShadowParts.join(", ") : null,
    textShadow: textShadowParts.length > 0 ? textShadowParts.join(", ") : null,
    layerBlur,
    backgroundBlur,
  };
}

function toShadowValue(effect: FigmaRawEffect, inset: boolean) {
  const color = effect.color ? toCssColor(effect.color) : "rgba(0, 0, 0, 0.18)";
  const offsetX = Math.round(effect.offset?.x ?? 0);
  const offsetY = Math.round(effect.offset?.y ?? 0);
  const blurRadius = Math.round(effect.radius ?? 0);
  const spreadRadius = Math.round(effect.spread ?? 0);
  const shadow = `${offsetX}px ${offsetY}px ${blurRadius}px ${spreadRadius}px ${color}`;

  return inset ? `inset ${shadow}` : shadow;
}

function toTextShadowValue(effect: FigmaRawEffect) {
  const color = effect.color ? toCssColor(effect.color) : "rgba(0, 0, 0, 0.18)";
  const offsetX = Math.round(effect.offset?.x ?? 0);
  const offsetY = Math.round(effect.offset?.y ?? 0);
  const blurRadius = Math.round(effect.radius ?? 0);
  return `${offsetX}px ${offsetY}px ${blurRadius}px ${color}`;
}

function maxEffectRadius(current: number | null, value?: number) {
  if (typeof value !== "number") {
    return current;
  }

  return current === null ? value : Math.max(current, value);
}

function mapConstraintAxis(value?: "MIN" | "CENTER" | "MAX" | "STRETCH" | "SCALE" | null): ParsedNode["constraints"] extends infer T
  ? T extends { horizontal: infer H }
    ? H | null
    : never
  : never {
  switch (value) {
    case "CENTER":
      return "center";
    case "MAX":
      return "end";
    case "STRETCH":
      return "stretch";
    case "SCALE":
      return "scale";
    case "MIN":
      return "start";
    default:
      return null;
  }
}

function getLinearGradientAngle(handles?: FigmaRawVector[]) {
  const start = handles?.[0];
  const end = handles?.[1];

  if (!start || !end) {
    return 180;
  }

  const dx = (end.x ?? 1) - (start.x ?? 0);
  const dy = (end.y ?? 0) - (start.y ?? 0);
  const radians = Math.atan2(dy, dx);
  const degrees = (radians * 180) / Math.PI + 90;

  return Math.round(((degrees % 360) + 360) % 360);
}

function getRadialGradientCenter(handles?: FigmaRawVector[]) {
  const center = handles?.[0];
  const x = Math.round((center?.x ?? 0.5) * 100);
  const y = Math.round((center?.y ?? 0.5) * 100);
  return `${x}% ${y}%`;
}

function tileBackgroundSize(fill: FigmaRawFill) {
  const scalingFactor = fill.scalingFactor;

  if (typeof scalingFactor !== "number" || !Number.isFinite(scalingFactor) || scalingFactor <= 0) {
    return "auto";
  }

  return `${Math.round(scalingFactor * 1000) / 10}% auto`;
}

function parseRotation(value?: number | string | null) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return normalizeDegrees(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);

    if (Number.isFinite(parsed)) {
      return normalizeDegrees(parsed);
    }
  }

  return null;
}

function normalizeDegrees(value: number) {
  const normalized = ((value % 360) + 360) % 360;
  return normalized > 180 ? normalized - 360 : normalized;
}

function isUnitLike(value: number) {
  return Math.abs(value - 1) < 0.001;
}

function roundTransformValue(value: number) {
  return Math.round(value * 1000) / 1000;
}

function toCssColor(color: FigmaRawColor, opacityMultiplier = 1) {
  const r = Math.round((color.r ?? 0) * 255);
  const g = Math.round((color.g ?? 0) * 255);
  const b = Math.round((color.b ?? 0) * 255);
  const a = (color.a ?? 1) * opacityMultiplier;

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function mapTextCase(value?: string | null) {
  switch (value) {
    case "UPPER":
      return "uppercase";
    case "LOWER":
      return "lowercase";
    case "TITLE":
      return "capitalize";
    case "SMALL_CAPS":
    case "SMALL_CAPS_FORCED":
      return "small-caps";
    default:
      return null;
  }
}

function mapTextDecoration(value?: string | null) {
  switch (value) {
    case "UNDERLINE":
      return "underline";
    case "STRIKETHROUGH":
      return "line-through";
    default:
      return null;
  }
}

function mapTextAlign(value?: string | null) {
  switch (value) {
    case "LEFT":
      return "left";
    case "CENTER":
      return "center";
    case "RIGHT":
      return "right";
    case "JUSTIFIED":
      return "justify";
    default:
      return null;
  }
}
