import { describe, expect, it } from "vitest";
import { collectFrameOptions, extractFileKeyFromUrl, extractNodeIdFromUrl, findNodeById } from "./mapper";
import type { FigmaRawNode } from "./types";

describe("Figma mapper", () => {
  it("extracts file and node identifiers from a Figma URL", () => {
    const url = "https://www.figma.com/design/file-key/Demo?node-id=12-34";

    expect(extractFileKeyFromUrl(url)).toBe("file-key");
    expect(extractNodeIdFromUrl(url)).toBe("12:34");
    expect(extractNodeIdFromUrl("not a url")).toBe("");
  });

  it("collects top-level frames and detects nested Auto Layout", () => {
    const document: FigmaRawNode = {
      type: "DOCUMENT",
      children: [
        {
          type: "CANVAS",
          children: [
            { id: "1:1", name: "Desktop", type: "FRAME", children: [{ type: "GROUP", layoutMode: "VERTICAL" }] },
            { id: "1:2", name: "Decoration", type: "RECTANGLE" },
          ],
        },
      ],
    };

    expect(collectFrameOptions(document)).toEqual([
      { id: "1:1", name: "Desktop", type: "FRAME", depth: 0, hasAutoLayout: true },
    ]);
  });

  it("finds deeply nested nodes and returns null for missing ids", () => {
    const target: FigmaRawNode = { id: "3:7", type: "TEXT", characters: "Target" };
    const root: FigmaRawNode = { id: "0:0", children: [{ id: "1:1", children: [{ children: [target] }] }] };

    expect(findNodeById(root, "3:7")).toBe(target);
    expect(findNodeById(root, "missing")).toBeNull();
  });
});
