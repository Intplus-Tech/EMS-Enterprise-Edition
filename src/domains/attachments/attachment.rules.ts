import { RequestStatus } from "../../enums/statuses";

/**
 * Limits and lifecycle rules for request attachments, shared by the browser,
 * the upload route and the attachment service so all three agree.
 */

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

/** Guards against a single request accumulating an unbounded document set. */
export const MAX_ATTACHMENTS_PER_REQUEST = 10;

/** Statuses where the ledger is settled and the document set must not change. */
export const LOCKED_FOR_ATTACHMENTS: RequestStatus[] = [
  RequestStatus.PAID,
  RequestStatus.CLOSED,
  RequestStatus.CANCELLED,
  RequestStatus.REJECTED,
];

/** Statuses in which the initiator still owns the request and may edit freely. */
export const INITIATOR_EDITABLE: RequestStatus[] = [
  RequestStatus.DRAFT,
  RequestStatus.RETURNED,
];

/** `1.4 MB` / `212 KB` — used in the attachment list and export columns. */
export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * A stored document reference is only openable if it is an absolute URL.
 *
 * Records created before the upload integration hold a bare filename here
 * instead, and so does every seeded record; the viewer detects that and
 * explains why there is nothing to open rather than linking to a dead path.
 */
export function isStoredUrl(source?: string | null): boolean {
  return /^https?:\/\//i.test(source ?? "");
}

/**
 * The display name for a stored file when only its URL was kept.
 *
 * The payment receipt was recorded as a bare URL string, so every screen that
 * showed it printed the whole Cloudinary path where a filename belonged.
 */
export function fileNameFromUrl(source: string): string {
  const withoutQuery = source.split("?")[0];
  return decodeURIComponent(withoutQuery.split("/").pop() || source);
}
