/**
 * Audit Trail Viewer (Admin) — filter bar, log table and pager.
 *
 * Presentational only: rows arrive already filtered and paged by the database
 * (see `useAuditTrailLogs`), so this file never fetches or slices. Consumed by
 * `src/app/(dashboard)/audit-trail/page.tsx`.
 */
import React, { useState } from "react";
import * as Icons from "lucide-react";
import { Pagination } from "../ui/Pagination";
import { EmptyState } from "../ui/EmptyState";
import { formatAuditLog } from "./auditTrailRow";
import { LogDto } from "../../types/api";
import { AUDIT_ACTION_OPTIONS, AuditTrailFilters } from "../../app/(dashboard)/hooks/useAuditTrailLogs";

interface AdminAuditTrailViewerTabProps {
  /** The current page of logs, newest first. */
  logs: LogDto[];
  loading: boolean;
  error?: string;
  filters: AuditTrailFilters;
  onFilterChange: (patch: Partial<AuditTrailFilters>) => void;
  page: number;
  rowsPerPage: number;
  /** Rows matching the filters across the whole collection, for the footer. */
  totalCount: number;
  onPageChange: (page: number) => void;
  onExport: () => void;
  exporting?: boolean;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.55rem 0.85rem",
  backgroundColor: "rgb(var(--color-background))",
  border: "1px solid rgb(var(--color-card-border))",
  borderRadius: "0.375rem",
  color: "rgb(var(--color-text))",
  fontSize: "0.85rem",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  color: "rgb(var(--color-text-muted))",
  fontWeight: 600,
  marginBottom: "0.35rem",
};

export const AdminAuditTrailViewerTab: React.FC<AdminAuditTrailViewerTabProps> = ({
  logs,
  loading,
  error,
  filters,
  onFilterChange,
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  onExport,
  exporting = false,
}) => {
  // No row is expanded until one is clicked; the previous default id ("log-1")
  // never matched a real log, so it expanded nothing.
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const rows = logs.map(formatAuditLog);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>Audit Trail Viewer</h1>
        <p style={{ fontSize: "0.9rem", color: "rgb(var(--color-text-muted))", marginTop: "0.25rem" }}>
          Comprehensive log of all system actions and status changes.
        </p>
      </div>

      {/* 4 Summary Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        {/* TODAY'S LOGS */}
        <div className="glass-panel" style={{ padding: "1.35rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icons.Eye size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "rgb(var(--color-text-muted))", textTransform: "uppercase" }}>TODAY&apos;S LOGS</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "rgb(var(--color-text))", marginTop: "0.15rem" }}>142</div>
            </div>
          </div>
        </div>

        {/* ANOMALIES */}
        <div className="glass-panel" style={{ padding: "1.35rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icons.ShieldAlert size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "rgb(var(--color-text-muted))", textTransform: "uppercase" }}>ANOMALIES</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "rgb(var(--color-text))", marginTop: "0.15rem" }}>3</div>
            </div>
          </div>
        </div>

        {/* ACTIVE USERS */}
        <div className="glass-panel" style={{ padding: "1.35rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(99, 102, 241, 0.15)", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icons.Users size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "rgb(var(--color-text-muted))", textTransform: "uppercase" }}>ACTIVE USERS</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "rgb(var(--color-text))", marginTop: "0.15rem" }}>24</div>
            </div>
          </div>
        </div>

        {/* LAST SYNC */}
        <div className="glass-panel" style={{ padding: "1.35rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icons.RefreshCw size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "rgb(var(--color-text-muted))", textTransform: "uppercase" }}>LAST SYNC</div>
              <div style={{ fontSize: "1.35rem", fontWeight: "800", color: "rgb(var(--color-text))", marginTop: "0.15rem" }}>Just Now</div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filter Section — every control re-queries the database */}
      <div className="glass-panel" style={{ padding: "1.25rem 1.5rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem", marginBottom: "2rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: "1rem", alignItems: "end" }}>
          <div>
            <label style={labelStyle}>Date Range</label>
            <select
              value={filters.dateRange}
              onChange={(e) => onFilterChange({ dateRange: e.target.value as AuditTrailFilters["dateRange"] })}
              style={inputStyle}
            >
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Today">Today</option>
              <option value="Last 30 Days">Last 30 Days</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>User Name</label>
            <input
              type="text"
              placeholder="e.g. David Marsh"
              value={filters.userName}
              onChange={(e) => onFilterChange({ userName: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Request ID</label>
            <input
              type="text"
              placeholder="REQ-0000"
              value={filters.reference}
              onChange={(e) => onFilterChange({ reference: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Action Type</label>
            <select
              value={filters.actionType}
              onChange={(e) => onFilterChange({ actionType: e.target.value })}
              style={inputStyle}
            >
              {AUDIT_ACTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Exports every log matching the filters, not just the visible page. */}
          <button
            onClick={onExport}
            disabled={exporting}
            style={{
              padding: "0.6rem 1.25rem",
              borderRadius: "0.375rem",
              border: "none",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              fontWeight: "600",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              cursor: exporting ? "wait" : "pointer",
              opacity: exporting ? 0.7 : 1,
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)"
            }}
          >
            <Icons.Download size={15} /> {exporting ? "Exporting…" : "Export Logs"}
          </button>
        </div>
      </div>

      {/* Logs Table Card */}
      <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
        {error && (
          <div style={{ marginBottom: "1rem", padding: "0.75rem 1rem", borderRadius: "0.5rem", backgroundColor: "rgba(239, 68, 68, 0.12)", color: "#ef4444", fontSize: "0.85rem" }}>
            {error}
          </div>
        )}

        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgb(var(--color-card-border))" }}>
              <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", paddingBottom: "0.75rem" }}>TIMESTAMP</th>
              <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", paddingBottom: "0.75rem" }}>USER</th>
              <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", paddingBottom: "0.75rem" }}>ACTION</th>
              <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", paddingBottom: "0.75rem" }}>STATUS CHANGE</th>
              <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", paddingBottom: "0.75rem", textAlign: "right" }}>IP ADDRESS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((log) => {
              const isExpanded = expandedLogId === log.id;
              return (
                <React.Fragment key={log.id}>
                  <tr
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    style={{ borderBottom: isExpanded ? "none" : "1px solid rgb(var(--color-card-border))", cursor: "pointer" }}
                  >
                    <td style={{ padding: "1.1rem 0", color: "rgb(var(--color-text-muted))", fontSize: "0.85rem", width: "180px" }}>
                      {log.timestamp}
                    </td>

                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                        <div style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          backgroundColor: "#2563eb",
                          color: "#ffffff",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          {log.userBadge}
                        </div>
                        <div>
                          <div style={{ fontWeight: "700", color: "rgb(var(--color-text))", fontSize: "0.85rem" }}>{log.userName}</div>
                          <div style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>{log.userRole}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span style={{
                        backgroundColor: "rgba(59, 130, 246, 0.12)",
                        color: "#3b82f6",
                        borderRadius: "0.375rem",
                        padding: "0.35rem 0.65rem",
                        fontSize: "0.78rem",
                        fontWeight: "600"
                      }}>
                        {log.action}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ backgroundColor: "rgba(148, 163, 184, 0.1)", color: "rgb(var(--color-text-muted))", padding: "0.3rem 0.6rem", borderRadius: "0.25rem", fontSize: "0.75rem" }}>
                          {log.statusFrom}
                        </span>
                        <Icons.ArrowRight size={14} style={{ color: "rgb(var(--color-text-muted))" }} />
                        <span style={{ backgroundColor: "#2563eb", color: "#ffffff", padding: "0.3rem 0.6rem", borderRadius: "0.25rem", fontSize: "0.75rem", fontWeight: "600" }}>
                          {log.statusTo}
                        </span>
                      </div>
                    </td>

                    <td style={{ textAlign: "right", color: "rgb(var(--color-text-muted))", fontSize: "0.82rem", fontFamily: "monospace" }}>
                      {log.ipAddress || "—"}
                    </td>
                  </tr>

                  {/* Expandable Details Row */}
                  {isExpanded && (
                    <tr style={{ borderBottom: "1px solid rgb(var(--color-card-border))" }}>
                      <td colSpan={5} style={{ padding: "0.5rem 1.5rem 1.25rem 1.5rem" }}>
                        <div style={{
                          backgroundColor: "rgb(var(--color-surface))",
                          borderLeft: "3px solid #2563eb",
                          borderRadius: "0 0.5rem 0.5rem 0",
                          padding: "1rem 1.25rem"
                        }}>
                          <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "rgb(var(--color-text-muted))", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <Icons.MessageSquare size={14} style={{ color: "#2563eb" }} /> VERBATIM FEEDBACK
                          </div>
                          <div style={{ fontSize: "0.85rem", color: "rgb(var(--color-text))", fontStyle: "italic", marginBottom: "0.85rem" }}>
                            {log.verbatimFeedback}
                          </div>
                          <div style={{ display: "flex", gap: "1.25rem", fontSize: "0.8rem" }}>
                            {log.attachmentsCount > 0 && (
                              <span style={{ color: "rgb(var(--color-primary))", fontWeight: "600" }}>
                                Attachments: {log.attachmentsCount}
                              </span>
                            )}
                            {log.requestRef && (
                              <span style={{ color: "rgb(var(--color-text-muted))" }}>Request: {log.requestRef}</span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {/* Loading / empty states — a bare tbody would read as "no activity". */}
        {loading && rows.length === 0 && (
          <div style={{ padding: "2.5rem", textAlign: "center", color: "rgb(var(--color-text-muted))", fontSize: "0.85rem" }}>
            Loading audit logs…
          </div>
        )}

        {!loading && rows.length === 0 && (
          <EmptyState
            icon={<Icons.FileSearch size={20} />}
            title="No matching log entries"
            description="Nothing was recorded for these filters. Try widening the date range or clearing the user and request filters."
          />
        )}

        {/* Footer pager — page changes refetch from the database */}
        <Pagination
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={totalCount}
          onPageChange={onPageChange}
          itemLabel="entries"
        />
      </div>
    </div>
  );
};
