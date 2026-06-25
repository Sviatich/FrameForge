import { describe, expect, it } from "vitest";
import type { FigmaRawNode } from "@/lib/figma/types";
import { generateProjectArtifacts } from "./generator";
import { parseFigmaNode } from "./parser";
import { transformNode } from "./transformer";

describe("Figma text pipeline", () => {
  it("preserves a colored fragment as a span in generated HTML", () => {
    const source: FigmaRawNode = {
      id: "1:1",
      name: "Title",
      type: "TEXT",
      characters: "Hello world",
      characterStyleOverrides: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
      styleOverrideTable: {
        "1": {
          fills: [{ type: "SOLID", color: { r: 1, g: 0, b: 0, a: 1 } }],
        },
      },
      fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0, a: 1 } }],
      style: { fontFamily: "Inter", fontSize: 24, fontWeight: 700 },
      absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 30 },
    };

    const parsed = parseFigmaNode(source);
    expect(parsed?.textSegments).toEqual([
      { text: "Hello ", color: null },
      { text: "world", color: "rgba(255, 0, 0, 1)" },
    ]);

    const transformed = transformNode(parsed!);
    const result = generateProjectArtifacts({ projectName: "Demo", mode: "live", nodeTree: transformed });
    const html = result.files.find((file) => file.path === "index.html")?.content;

    expect(html).toContain('Hello <span style="color: rgba(255, 0, 0, 1)">world</span>');
  });

  it("normalizes visual properties used by layout and generated CSS", () => {
    const source: FigmaRawNode = {
      id: "2:1",
      name: "Hero image",
      type: "FRAME",
      absoluteBoundingBox: { x: 10, y: 20, width: 800, height: 400 },
      layoutMode: "HORIZONTAL",
      layoutWrap: "WRAP",
      itemSpacing: 24,
      paddingTop: 16,
      paddingRight: 20,
      paddingBottom: 16,
      paddingLeft: 20,
      rectangleCornerRadii: [8, 12, 16, 20],
      fills: [
        { type: "IMAGE", imageRef: "hero", scaleMode: "FILL" },
        {
          type: "GRADIENT_LINEAR",
          gradientStops: [
            { position: 0, color: { r: 0, g: 0, b: 0, a: 1 } },
            { position: 1, color: { r: 1, g: 1, b: 1, a: 1 } },
          ],
          gradientHandlePositions: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
        },
      ],
      strokes: [{ type: "SOLID", color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 0.5 }],
      strokeWeight: 2,
      individualStrokeWeights: { top: 1, right: 2, bottom: 3, left: 4 },
      constraints: { horizontal: "STRETCH", vertical: "CENTER" },
      effects: [
        {
          type: "DROP_SHADOW",
          radius: 8,
          spread: 2,
          offset: { x: 0, y: 4 },
          color: { r: 0, g: 0, b: 0, a: 0.25 },
        },
        { type: "LAYER_BLUR", radius: 3 },
      ],
    };

    const parsed = parseFigmaNode(source, {
      imageFills: { hero: "https://cdn.example/hero.png" },
      renderedNodes: {},
    })!;

    expect(parsed.layout).toMatchObject({ mode: "row", wrap: "wrap", gap: 24, padding: [16, 20, 16, 20] });
    expect(parsed.cornerRadii).toEqual([8, 12, 16, 20]);
    expect(parsed.backgroundImageUrl).toBe("https://cdn.example/hero.png");
    expect(parsed.backgroundSize).toBe("cover");
    expect(parsed.backgroundGradient).toContain("linear-gradient");
    expect(parsed.borderSides).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });
    expect(parsed.constraints).toEqual({ horizontal: "stretch", vertical: "center" });
    expect(parsed.boxShadow).toContain("0px 4px 8px 2px");
    expect(parsed.layerBlur).toBe(3);
  });

  it("skips hidden Figma nodes", () => {
    expect(parseFigmaNode({ id: "hidden", type: "FRAME", visible: false })).toBeNull();
  });

  it("escapes text received from Figma", () => {
    const source: FigmaRawNode = {
      id: "1:2",
      name: "Safe text",
      type: "TEXT",
      characters: "<script>alert('x')</script>",
      absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 30 },
    };
    const parsed = parseFigmaNode(source)!;
    const result = generateProjectArtifacts({
      projectName: "Demo",
      mode: "live",
      nodeTree: transformNode(parsed),
    });

    expect(result.previewHtml).not.toContain("<script>alert");
    expect(result.previewHtml).toContain("&lt;script&gt;");
  });

  it("keeps document landmarks unique and does not turn navigation into a header", () => {
    const source: FigmaRawNode = {
      id: "page",
      name: "Page",
      type: "FRAME",
      children: [
        {
          id: "header-1",
          name: "Header",
          type: "FRAME",
          children: [],
        },
        {
          id: "nav-1",
          name: "Main nav",
          type: "FRAME",
          children: [],
        },
        {
          id: "main-1",
          name: "Main",
          type: "FRAME",
          children: [
            {
              id: "title-1",
              name: "Title",
              type: "TEXT",
              characters: "First title",
              style: { fontSize: 48 },
            },
          ],
        },
        {
          id: "main-2",
          name: "Main content",
          type: "FRAME",
          children: [
            {
              id: "title-2",
              name: "Title",
              type: "TEXT",
              characters: "Second title",
              style: { fontSize: 48 },
            },
          ],
        },
        {
          id: "footer-1",
          name: "Footer",
          type: "FRAME",
          children: [],
        },
        {
          id: "footer-2",
          name: "Footer bottom",
          type: "FRAME",
          children: [],
        },
      ],
    };

    const transformed = transformNode(parseFigmaNode(source)!);
    const tags: string[] = [];

    const collectTags = (node: typeof transformed) => {
      tags.push(node.tag);
      node.children.forEach(collectTags);
    };

    collectTags(transformed);

    expect(tags.filter((tag) => tag === "h1")).toHaveLength(1);
    expect(tags.filter((tag) => tag === "main")).toHaveLength(1);
    expect(tags.filter((tag) => tag === "footer")).toHaveLength(1);
    expect(tags).toContain("nav");
  });
});
