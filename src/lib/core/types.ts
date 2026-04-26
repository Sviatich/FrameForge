// Внутренние типы pipeline: parsed model, transformed model и итоговые generated artifacts.
export type ParsedLayout = {
  mode: "none" | "row" | "column";
  wrap: "nowrap" | "wrap";
  gap: number;
  padding: [number, number, number, number];
  primaryAxisAlign: "start" | "center" | "end" | "space-between";
  counterAxisAlign: "start" | "center" | "end" | "stretch";
  primaryAxisSizing: "fixed" | "auto";
  counterAxisSizing: "fixed" | "auto";
};

export type ParsedConstraints = {
  horizontal: "start" | "center" | "end" | "stretch" | "scale";
  vertical: "start" | "center" | "end" | "stretch" | "scale";
};

export type ParsedComponentMeta = {
  kind: "component" | "instance" | "component-set";
  componentId: string | null;
  componentKey: string | null;
  componentName: string | null;
  componentSetId: string | null;
  propertyKeys: string[];
};

export type ParsedNode = {
  id: string;
  name: string;
  type: string;
  textContent: string;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  fontFamily: string | null;
  fontSize: number | null;
  fontWeight: number | null;
  lineHeight: number | null;
  lineHeightPercentFontSize: number | null;
  letterSpacing: number | null;
  textTransform: string | null;
  textDecoration: string | null;
  textAlign: string | null;
  paragraphSpacing: number | null;
  paragraphIndent: number | null;
  listSpacing: number | null;
  textAutoResize: "none" | "width-and-height" | "height" | "truncate" | null;
  textTruncation: "disabled" | "ending" | null;
  maxLines: number | null;
  textColor: string | null;
  cornerRadius: number | null;
  cornerRadii: [number, number, number, number] | null;
  backgroundColor: string | null;
  backgroundGradient: string | null;
  borderColor: string | null;
  borderWidth: number | null;
  borderSides: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  } | null;
  backgroundImageUrl: string | null;
  backgroundSize: string | null;
  backgroundRepeat: "no-repeat" | "repeat" | null;
  backgroundPosition: string | null;
  assetUrl: string | null;
  assetFit: "cover" | "contain" | "fill" | null;
  opacity: number | null;
  boxShadow: string | null;
  textShadow: string | null;
  layerBlur: number | null;
  backgroundBlur: number | null;
  parentWidth: number | null;
  parentHeight: number | null;
  right: number | null;
  bottom: number | null;
  centerOffsetX: number | null;
  centerOffsetY: number | null;
  constraints: ParsedConstraints | null;
  rotation: number | null;
  scaleX: number | null;
  scaleY: number | null;
  componentMeta: ParsedComponentMeta | null;
  layoutGrow: number;
  layoutAlign: "inherit" | "stretch" | "center" | "end" | "start" | null;
  layoutPositioning: "auto" | "absolute";
  layout: ParsedLayout;
  effectsCount: number;
  children: ParsedNode[];
};

export type TransformedNode = {
  id: string;
  name: string;
  type: string;
  tag: string;
  className: string;
  textContent: string;
  role: "layout" | "content" | "control";
  semanticKind:
    | "container"
    | "section"
    | "media"
    | "icon"
    | "button"
    | "link"
    | "card"
    | "list"
    | "list-item"
    | "nav-group";
  sectionPattern:
    | "none"
    | "hero"
    | "header"
    | "footer"
    | "split"
    | "card-grid"
    | "journal-list"
    | "testimonial"
    | "cta"
    | "stack";
  isComponentCandidate: boolean;
  attributes: Record<string, string>;
  styles: Record<string, string>;
  children: TransformedNode[];
};

export type GeneratedFontAsset = {
  family: string;
  importUrl: string;
};

export type GeneratedFile = {
  path: string;
  language: "html" | "tsx" | "ts" | "css" | "json" | "md";
  content: string;
};

export type GeneratedProjectArtifacts = {
  files: GeneratedFile[];
  previewHtml: string;
  summary: string;
  entryFilePath: string;
  generatedAt: string;
};
