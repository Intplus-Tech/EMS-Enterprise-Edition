/**
 * Shapes a raw `LogDto` into the row the Audit Trail table and its CSV export
 * both render.
 *
 * Shared because the export no longer reuses the table's rows: paging moved to
 * the database, so the CSV is built from a separate fetch of every matching log
 * and must still format each column identically.
 */
import { CsvColumn } from "../ui/exportCsv";
import { LogDto } from "../../types/api";

export interface AuditTrailRow {
  id: string;
  timestamp: string;
  requestRef: string;
  userBadge: string;
  userName: string;
  userRole: string;
  action: string;
  statusFrom: string;
  statusTo: string;
  ipAddress: string;
  verbatimFeedback: string;
  attachmentsCount: number;
}

export function formatAuditLog(log: LogDto): AuditTrailRow {
  const details = (log.details ?? {}) as Record<string, unknown>;

  return {
    id: log._id,
    requestRef: String(details.requestNumber || details.requestId || ""),
    timestamp: log.timestamp
      ? new Date(log.timestamp).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "N/A",
    userBadge: log.actorName
      ? log.actorName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "SYS",
    userName: log.actorName || "System Engine",
    userRole: log.actorRole || "System",
    action: log.action || "Log Event",
    statusFrom: String(details.statusBefore || "System Event"),
    statusTo: String(details.statusAfter || log.action || "Completed"),
    // Never fabricated: an audit trail that invents an IP is worse than one that
    // admits it does not have it, and this value is exported to CSV.
    ipAddress: log.ipAddress || "",
    verbatimFeedback: log.message ? `"${log.message}"` : '"No comment recorded."',
    attachmentsCount: Number(details.attachmentsCount || 0),
  };
}

export const AUDIT_CSV_COLUMNS: CsvColumn<AuditTrailRow>[] = [
  { header: "Timestamp", value: (l) => l.timestamp },
  { header: "User", value: (l) => l.userName },
  { header: "Role", value: (l) => l.userRole },
  { header: "Action", value: (l) => l.action },
  { header: "Request", value: (l) => l.requestRef },
  { header: "Detail", value: (l) => l.verbatimFeedback },
  { header: "IP Address", value: (l) => l.ipAddress },
];
