import { describe, expect, it } from "vitest";
import { buildArchiveDownloadName, readArchiveDownloadName } from "./download-name";

describe("archive download name", () => {
  it("keeps Cyrillic characters and adds the product suffix", () => {
    expect(buildArchiveDownloadName("Интернет магазин")).toBe("интернет-магазин-frameforge.zip");
  });

  it("reads an UTF-8 filename from Content-Disposition", () => {
    const name = "лендинг-frameforge.zip";
    const header = `attachment; filename="frameforge.zip"; filename*=UTF-8''${encodeURIComponent(name)}`;

    expect(readArchiveDownloadName(header, "fallback")).toBe(name);
  });
});
