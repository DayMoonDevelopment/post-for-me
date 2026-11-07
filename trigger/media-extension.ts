// Single source of truth for mapping a MIME type to the file extension that
// should be used when a media object is stored (localized, transformed, or
// otherwise written to our own storage). Keeping this in one place avoids the
// per-task maps drifting out of sync with each other and producing storage
// objects with missing or incorrect extensions.
const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/avif": ".avif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/mov": ".mov",
  "video/quicktime": ".mov",
  "video/avi": ".avi",
  "application/pdf": ".pdf",
};

/**
 * Maps a MIME type (optionally with parameters, e.g. "image/jpeg; charset=binary")
 * to a file extension that includes the leading dot, e.g. ".jpg".
 *
 * Falls back to deriving an extension from the image/video subtype for types
 * not in the table above (e.g. "image/heic" -> ".heic"), so media objects we
 * localize or transform always get an extension matching their actual file
 * type even for formats we haven't explicitly enumerated. Returns "" when the
 * type is missing or isn't an image/video/pdf we recognize (e.g. a generic
 * "application/octet-stream" stream with no real file type to reflect).
 */
export const mimeTypeToExtension = (contentType?: string | null): string => {
  if (!contentType) return "";

  const normalized = contentType.split(";")[0].trim().toLowerCase();
  if (MIME_TO_EXTENSION[normalized]) {
    return MIME_TO_EXTENSION[normalized];
  }

  if (normalized.startsWith("image/") || normalized.startsWith("video/")) {
    const subtype = normalized
      .split("/")[1]
      ?.replace(/^x-/, "")
      .split("+")[0];
    if (subtype) return `.${subtype}`;
  }

  return "";
};
