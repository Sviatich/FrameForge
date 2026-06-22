import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FigmaApiError,
  fetchFigmaAssetUrls,
  formatRetryAfter,
  isFigmaAuthenticationError,
  resolveFigmaFile,
} from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Figma API client", () => {
  it("loads a Figma document with an OAuth bearer token", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ name: "Demo", document: { id: "0:0", type: "DOCUMENT" } }))),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveFigmaFile({
      kind: "figma-link",
      url: "https://figma.com/design/key-123/Demo?node-id=1-2",
      accessToken: "secret-token",
    });

    expect(result.fileKey).toBe("key-123");
    expect(result.suggestedNodeId).toBe("1:2");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: "/v1/files/key-123" }),
      expect.objectContaining({ headers: { Authorization: "Bearer secret-token" } }),
    );
  });

  it("classifies invalid tokens as authentication errors", () => {
    const unauthorized = new FigmaApiError(new Response(null, { status: 401, statusText: "Unauthorized" }), "");
    const invalidToken = new FigmaApiError(new Response(null, { status: 403, statusText: "Forbidden" }), "Invalid token");
    const forbidden = new FigmaApiError(new Response(null, { status: 403, statusText: "Forbidden" }), "No access to file");

    expect(isFigmaAuthenticationError(unauthorized)).toBe(true);
    expect(isFigmaAuthenticationError(invalidToken)).toBe(true);
    expect(isFigmaAuthenticationError(forbidden)).toBe(false);
  });

  it("collects image fills and rendered vector assets", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/files/file-key/images")) {
        return Promise.resolve(new Response(JSON.stringify({ meta: { images: { imageRef: "https://cdn/image.png" } } })));
      }

      return Promise.resolve(new Response(JSON.stringify({ images: { "2:1": "https://cdn/vector.svg" } })));
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchFigmaAssetUrls({
      accessToken: "token",
      fileKey: "file-key",
      node: {
        id: "1:1",
        type: "FRAME",
        fills: [{ type: "IMAGE", imageRef: "imageRef" }],
        children: [{ id: "2:1", type: "VECTOR" }],
      },
    });

    expect(result.imageFills.imageRef).toBe("https://cdn/image.png");
    expect(result.renderedNodes["2:1"]).toBe("https://cdn/vector.svg");
  });

  it("formats retry intervals for rate-limit messages", () => {
    expect(formatRetryAfter(1)).toBe("1 секунду");
    expect(formatRetryAfter(125)).toBe("3 минуты");
    expect(formatRetryAfter(7_200)).toBe("2 часа");
  });
});
