const ARCHIVE_SUFFIX = "frameforge";

export function buildArchiveDownloadName(projectName: string) {
  const normalizedName = projectName
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  const baseName = normalizedName || "project";

  return `${baseName}-${ARCHIVE_SUFFIX}.zip`;
}

export function readArchiveDownloadName(contentDisposition: string | null, projectName: string) {
  const fallback = buildArchiveDownloadName(projectName);

  if (!contentDisposition) {
    return fallback;
  }

  const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1]);
    } catch {
      return fallback;
    }
  }

  return contentDisposition.match(/filename="([^"]+)"/i)?.[1] ?? fallback;
}
