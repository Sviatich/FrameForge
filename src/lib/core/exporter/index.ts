import JSZip from "jszip";
import path from "node:path";
import type { GeneratedFile } from "../types";

// Экспорт собирается на сервере без сохранения проекта: внешние изображения локализуются в assets/.
export async function buildLocalizedProjectArchive(files: GeneratedFile[]) {
  const archive = new JSZip();
  const assetReferences = collectAssetReferences(files);
  const downloadedAssets = await downloadAssets([...assetReferences]);
  const assetPathsByUrl = new Map<string, string>();

  downloadedAssets.forEach((asset, index) => {
    const assetPath = `assets/image-${index + 1}${asset.extension}`;
    archive.file(assetPath, asset.bytes);
    assetPathsByUrl.set(asset.url, assetPath);
  });

  files.forEach((file) => {
    archive.file(file.path, rewriteAssetReferences(file, assetPathsByUrl));
  });

  return archive.generateAsync({ type: "arraybuffer" });
}

type DownloadedAsset = {
  url: string;
  extension: string;
  bytes: ArrayBuffer;
};

function collectAssetReferences(files: GeneratedFile[]) {
  const urls = new Set<string>();

  files.forEach((file) => {
    if (file.language !== "html" && file.language !== "css") {
      return;
    }

    for (const match of file.content.matchAll(/\bsrc=(["'])(https?:\/\/[^"']+)\1/g)) {
      urls.add(match[2]);
    }

    for (const match of file.content.matchAll(/\burl\(\s*(["']?)(https?:\/\/[^"')]+)\1\s*\)/g)) {
      urls.add(match[2]);
    }
  });

  return urls;
}

async function downloadAssets(urls: string[]) {
  const assets: DownloadedAsset[] = [];
  const concurrency = 5;
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < urls.length) {
      const currentUrl = urls[nextIndex];
      nextIndex += 1;

      const asset = await downloadAsset(currentUrl);

      if (asset) {
        assets.push(asset);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
  return assets;
}

async function downloadAsset(url: string): Promise<DownloadedAsset | null> {
  try {
    const response = await fetch(decodeHtmlEntities(url));

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.startsWith("image/")) {
      return null;
    }

    return {
      url,
      extension: getAssetExtension(url, contentType),
      bytes: await response.arrayBuffer(),
    };
  } catch {
    return null;
  }
}

function rewriteAssetReferences(file: GeneratedFile, assetPathsByUrl: Map<string, string>) {
  if (file.language !== "html" && file.language !== "css") {
    return file.content;
  }

  let content = file.content;

  assetPathsByUrl.forEach((assetPath, url) => {
    const localPath = getRelativeAssetPath(file.path, assetPath);
    content = content.split(url).join(localPath);
  });

  return content;
}

function getRelativeAssetPath(filePath: string, assetPath: string) {
  const normalizedFilePath = filePath.replaceAll("\\", "/");
  const directory = path.posix.dirname(normalizedFilePath);
  const relativePath = path.posix.relative(directory === "." ? "" : directory, assetPath);
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

function getAssetExtension(url: string, contentType: string) {
  const extensionByMime = new Map([
    ["image/jpeg", ".jpg"],
    ["image/png", ".png"],
    ["image/webp", ".webp"],
    ["image/gif", ".gif"],
    ["image/svg+xml", ".svg"],
    ["image/avif", ".avif"],
  ]);
  const byMime = extensionByMime.get(contentType.split(";")[0].trim().toLowerCase());

  if (byMime) {
    return byMime;
  }

  try {
    const pathname = new URL(decodeHtmlEntities(url)).pathname;
    const extension = path.posix.extname(pathname).toLowerCase();
    return extension && extension.length <= 6 ? extension : ".bin";
  } catch {
    return ".bin";
  }
}

function decodeHtmlEntities(value: string) {
  return value.replaceAll("&amp;", "&");
}
