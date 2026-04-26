// Типы сырых данных Figma API и промежуточных сущностей интеграционного слоя.
export type FigmaSourceInput = {
  kind: "figma-link";
  url: string;
  accessToken?: string;
};

export type FigmaRawColor = {
  r?: number;
  g?: number;
  b?: number;
  a?: number;
};

export type FigmaRawVector = {
  x?: number;
  y?: number;
};

export type FigmaRawGradientStop = {
  position?: number;
  color?: FigmaRawColor;
};

export type FigmaRawConstraints = {
  horizontal?: "MIN" | "CENTER" | "MAX" | "STRETCH" | "SCALE";
  vertical?: "MIN" | "CENTER" | "MAX" | "STRETCH" | "SCALE";
};

export type FigmaRawFill = {
  type?: "SOLID" | "IMAGE" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND" | string;
  visible?: boolean;
  color?: FigmaRawColor;
  opacity?: number;
  imageRef?: string;
  scaleMode?: "FILL" | "FIT" | "TILE" | "STRETCH";
  scalingFactor?: number;
  rotation?: number;
  gradientStops?: FigmaRawGradientStop[];
  gradientHandlePositions?: FigmaRawVector[];
};

export type FigmaRawComponentPropertyDefinition = {
  type?: "BOOLEAN" | "INSTANCE_SWAP" | "TEXT" | "VARIANT" | string;
  defaultValue?: boolean | string;
  variantOptions?: string[];
};

export type FigmaRawComponentProperty = {
  type?: "BOOLEAN" | "INSTANCE_SWAP" | "TEXT" | "VARIANT" | string;
  value?: boolean | string;
};

export type FigmaRawMainComponent = {
  key?: string;
  name?: string;
  componentSetId?: string;
};

export type FigmaRawNode = {
  id?: string;
  name?: string;
  type?: string;
  visible?: boolean;
  characters?: string;
  children?: FigmaRawNode[];
  fills?: FigmaRawFill[];
  strokes?: FigmaRawFill[];
  strokeWeight?: number;
  individualStrokeWeights?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  backgroundColor?: FigmaRawColor;
  absoluteBoundingBox?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  relativeTransform?: [[number, number, number], [number, number, number]];
  rotation?: number | string;
  rectangleCornerRadii?: [number, number, number, number];
  constraints?: FigmaRawConstraints;
  componentId?: string;
  mainComponent?: FigmaRawMainComponent;
  componentPropertyDefinitions?: Record<string, FigmaRawComponentPropertyDefinition>;
  componentProperties?: Record<string, FigmaRawComponentProperty>;
  opacity?: number;
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL";
  layoutWrap?: "NO_WRAP" | "WRAP";
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  primaryAxisSizingMode?: "FIXED" | "AUTO";
  counterAxisSizingMode?: "FIXED" | "AUTO";
  itemSpacing?: number;
  layoutGrow?: number;
  layoutAlign?: string;
  layoutPositioning?: "AUTO" | "ABSOLUTE";
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  cornerRadius?: number;
  effects?: FigmaRawEffect[];
  style?: {
    fontFamily?: string;
    fontWeight?: number;
    fontSize?: number;
    lineHeightPx?: number;
    lineHeightPercentFontSize?: number;
    letterSpacing?: number;
    textAlignHorizontal?: string;
    textCase?: string;
    textDecoration?: string;
    paragraphSpacing?: number;
    paragraphIndent?: number;
    listSpacing?: number;
    textAutoResize?: "NONE" | "WIDTH_AND_HEIGHT" | "HEIGHT" | "TRUNCATE" | string;
    textTruncation?: "DISABLED" | "ENDING" | string;
    maxLines?: number;
  };
  lineTypes?: ("ORDERED" | "UNORDERED" | "NONE" | string)[];
  lineIndentations?: number[];
};

export type FigmaRawEffect = {
  type?: "DROP_SHADOW" | "INNER_SHADOW" | "LAYER_BLUR" | "BACKGROUND_BLUR";
  visible?: boolean;
  radius?: number;
  spread?: number;
  color?: FigmaRawColor;
  offset?: FigmaRawVector;
};

export type FigmaAssetUrls = {
  imageFills: Record<string, string>;
  renderedNodes: Record<string, string>;
};

export type FigmaRawFile = {
  name?: string;
  document?: FigmaRawNode;
};

export type FigmaFrameOption = {
  id: string;
  name: string;
  type: string;
  depth: number;
  hasAutoLayout: boolean;
};

export type FigmaResolvedFile = {
  fileKey: string;
  fileName: string;
  mode: "live";
  suggestedNodeId?: string;
  document: FigmaRawNode;
  raw: unknown;
  accessToken?: string;
};
