// Pure + browser helpers for bulk import. The pure functions (path prefixing,
// dedup, accepted-type checks, concurrency) are unit-tested; sha256 and zip
// expansion use browser APIs and a maintained lib but keep their logic thin.

export const ACCEPTED_EXTENSIONS = [
  "pdf", "docx", "doc", "txt", "rtf", "eml", "msg", "csv",
  "jpg", "jpeg", "png", "heic", "mp4", "mp3", "m4a", "wav", "zip",
];

export function isAccepted(filename: string): boolean {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  return ACCEPTED_EXTENSIONS.includes(ext);
}

// A zip member is ingested as an individual file with the zip name prefixed onto
// its folder path so provenance ("came from archive.zip/subdir") is preserved.
export function zipMemberFolderPath(zipName: string, memberPath: string): string {
  const base = zipName.replace(/\.zip$/i, "");
  const dir = memberPath.includes("/") ? memberPath.slice(0, memberPath.lastIndexOf("/")) : "";
  return dir ? `${base}/${dir}` : base;
}

export function memberFilename(memberPath: string): string {
  return memberPath.includes("/") ? memberPath.slice(memberPath.lastIndexOf("/") + 1) : memberPath;
}

// Batch-scoped storage prefix inside the existing evidence-files bucket.
export function importStoragePath(caseId: string, batchId: string, sha256: string, filename: string): string {
  const ext = filename.split(".").pop() ?? "bin";
  return `${caseId}/imports/${batchId}/${sha256.slice(0, 16)}-${Date.now()}.${ext}`;
}

// Dedup within a case: a file whose hash already exists is a duplicate of the
// first-seen id. Returns null when unseen.
export function findDuplicateId(sha256: string, existing: Map<string, string>): string | null {
  return existing.get(sha256) ?? null;
}

// SHA-256 hex via Web Crypto (browser). Kept isolated so tests don't need it.
export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Bounded-concurrency mapper for uploads (default 5 in flight).
export async function mapWithConcurrency<T, R>(
  items: T[], limit: number, worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

// Expand a zip client-side into individual member files (browser; uses fflate).
export interface ExpandedMember { filename: string; folderPath: string; data: Uint8Array }
export async function expandZip(zipFile: File): Promise<ExpandedMember[]> {
  const { unzipSync } = await import("fflate");
  const buf = new Uint8Array(await zipFile.arrayBuffer());
  const entries = unzipSync(buf);
  const out: ExpandedMember[] = [];
  for (const [path, data] of Object.entries(entries)) {
    if (path.endsWith("/") || data.length === 0) continue; // skip directories
    if (!isAccepted(path)) continue;
    out.push({
      filename: memberFilename(path),
      folderPath: zipMemberFolderPath(zipFile.name, path),
      data,
    });
  }
  return out;
}
