import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/export/local", () => {
  it("returns a ZIP with an UTF-8 project filename", async () => {
    const request = new Request("http://localhost/api/export/local", {
      method: "POST",
      body: JSON.stringify({
        projectName: "Главная страница",
        files: [{ path: "index.html", language: "html", content: "<h1>Demo</h1>" }],
      }),
    });

    const response = await POST(request);
    const archive = await JSZip.loadAsync(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("content-disposition")).toContain(
      encodeURIComponent("главная-страница-frameforge.zip"),
    );
    expect(archive.file("index.html")).not.toBeNull();
  });

  it("returns 400 for an invalid file contract", async () => {
    const request = new Request("http://localhost/api/export/local", {
      method: "POST",
      body: JSON.stringify({ projectName: "Demo", files: [{ path: "index.exe", language: "exe", content: "" }] }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toHaveProperty("message");
  });
});
