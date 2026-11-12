/**
 * GrantFlow AI — Document storage rules
 *
 * Uploaded files are stored in the database (DocumentBlob) rather than on the
 * server's disk. Serverless hosts such as Vercel do not keep files written to
 * disk, so anything saved there disappears.
 *
 * Client-safe: constants and pure helpers only (no Prisma import).
 */

/** Serverless request bodies are capped at about 4.5 MB, so one file per
 *  request and a 4 MB ceiling per file keeps every upload under the cap. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "4 MB";

/** Extension → content type we are willing to store and serve. */
export const ALLOWED_UPLOADS: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** Content types a browser may display in a tab; everything else downloads. */
const INLINE_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);

export function extensionOf(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  return i === -1 ? "" : fileName.slice(i + 1).toLowerCase();
}

/** Returns the content type to store for a file name, or null if not allowed.
 *  The type is derived from the extension, never trusted from the browser. */
export function contentTypeFor(fileName: string): string | null {
  return ALLOWED_UPLOADS[extensionOf(fileName)] ?? null;
}

export function validateUpload(fileName: string, size: number): string | null {
  if (!contentTypeFor(fileName)) {
    return `"${fileName}" is not a supported file type. Use PDF, DOC, DOCX, XLS, XLSX, PNG, or JPG.`;
  }
  if (size <= 0) return `"${fileName}" is empty.`;
  if (size > MAX_UPLOAD_BYTES) {
    return `"${fileName}" is larger than ${MAX_UPLOAD_LABEL}. Compress it or split it into smaller files.`;
  }
  return null;
}

export function documentFileUrl(documentId: string): string {
  return `/api/organizations/documents/${documentId}/file`;
}

/** Files uploaded before database storage existed were written to local disk
 *  and are not recoverable on a serverless host. */
export function isLegacyDiskFile(fileUrl: string): boolean {
  return fileUrl.startsWith("/uploads/");
}

export function contentDisposition(fileName: string, mimeType: string): string {
  const mode = INLINE_TYPES.has(mimeType) ? "inline" : "attachment";
  const ascii = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `${mode}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
