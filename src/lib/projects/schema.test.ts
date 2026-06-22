import { describe, expect, it } from "vitest";
import { figmaSourceSchema, transformProjectRequestSchema } from "./schema";

describe("Figma request schemas", () => {
  it("accepts a valid Figma file link", () => {
    const result = figmaSourceSchema.parse({
      kind: "figma-link",
      url: "https://www.figma.com/design/abc123/Demo",
      accessToken: "",
    });

    expect(result.url).toBe("https://www.figma.com/design/abc123/Demo");
  });

  it("rejects links from other services", () => {
    const result = figmaSourceSchema.safeParse({
      kind: "figma-link",
      url: "https://example.com/design/abc123",
    });

    expect(result.success).toBe(false);
  });

  it("requires a selected frame for transformation", () => {
    const result = transformProjectRequestSchema.safeParse({
      selectedNodeId: "",
      source: { kind: "figma-link", url: "https://figma.com/design/abc123/Demo" },
    });

    expect(result.success).toBe(false);
  });
});
