import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildLocalizedProjectArchive } from ".";

describe("project archive exporter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("places generated project files into a readable ZIP archive", async () => {
    const archiveBytes = await buildLocalizedProjectArchive([
      { path: "index.html", language: "html", content: "<h1>FrameForge</h1>" },
      { path: "styles.css", language: "css", content: "h1 { color: red; }" },
    ]);
    const archive = await JSZip.loadAsync(archiveBytes);

    expect(Object.keys(archive.files)).toEqual(expect.arrayContaining(["index.html", "styles.css"]));
    await expect(archive.file("index.html")?.async("string")).resolves.toBe("<h1>FrameForge</h1>");
  });

  it("downloads external images and rewrites references to local assets", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(new Uint8Array([1, 2, 3]), {
            headers: { "content-type": "image/png" },
          }),
        ),
      ),
    );
    const archiveBytes = await buildLocalizedProjectArchive([
      {
        path: "pages/index.html",
        language: "html",
        content: '<img src="https://cdn.example/image.png?size=2&amp;quality=90" />',
      },
    ]);
    const archive = await JSZip.loadAsync(archiveBytes);
    const html = await archive.file("pages/index.html")!.async("string");

    expect(html).toContain('../assets/image-1.png');
    expect(archive.file("assets/image-1.png")).not.toBeNull();
  });

  it("keeps the original URL when an asset cannot be downloaded", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(null, { status: 404 }))));
    const externalUrl = "https://cdn.example/missing.png";
    const archiveBytes = await buildLocalizedProjectArchive([
      { path: "index.html", language: "html", content: `<img src="${externalUrl}" />` },
    ]);
    const archive = await JSZip.loadAsync(archiveBytes);

    await expect(archive.file("index.html")!.async("string")).resolves.toContain(externalUrl);
  });
});
