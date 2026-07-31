import React, { useState } from "react";
import * as Icons from "lucide-react";
import { datedFilename, downloadCsv } from "../ui/exportCsv";

interface AdminAuditTrailViewerTabProps {
  logs?: any[];
}

export const AdminAuditTrailViewerTab: React.FC<AdminAuditTrailViewerTabProps> = ({
  logs = []
}) => {
  const [dateRange, setDateRange] = useState("Last 7 Days");
  const [userNameFilter, setUserNameFilter] = useState("");
  const [reqIdFilter, setReqIdFilter] = useState("");
  const [actionTypeFilter, setActionTypeFilter] = useState("All Actions");
  // No row is expanded until one is clicked; the previous default id
  // ("log-1") never matched a real log, so it expanded nothing.
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const formattedLiveLogs = logs.map((l: any) => ({
    id: l._id || l.id,
    // Kept alongside the formatted string so filtering can compare real dates.
    rawTimestamp: l.timestamp ? new Date(l.timestamp) : null,
    requestRef: l.details?.requestNumber || l.details?.requestId || "",
    timestamp: l.timestamp ? new Date(l.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A",
    userBadge: l.actorName ? l.actorName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "SYS",
    userName: l.actorName || "System Engine",
    userRole: l.actorRole || "System",
    action: l.action || "Log Event",
    statusFrom: l.details?.statusBefore || "System Event",
    statusTo: l.details?.statusAfter || l.action || "Completed",
    // Never fabricated: an audit trail that invents an IP is worse than one
    // that admits it does not have it, and this value is exported to CSV.
    ipAddress: l.ipAddress || "",
    verbatimFeedback: l.message ? `"${l.message}"` : '"No comment recorded."',
    attachmentsCount: l.details?.attachmentsCount || 0
  }));

  /**
   * Applies the filter bar. These four controls previously updated state that
   * nothing read, so the table always showed every log and "Apply Filters" was
   * an alert. Filtering is live — the button now just scrolls intent, matching
   * how the other tables in the app behave.
   */
  const displayLogs = formattedLiveLogs.filter((log) => {
    if (userNameFilter.trim()) {
      if (!log.userName.toLowerCase().includes(userNameFilter.trim().toLowerCase())) return false;
    }

    if (reqIdFilter.trim()) {
      const needle = reqIdFilter.trim().toLowerCase();
      const haystack = `${log.requestRef} ${log.verbatimFeedback}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }

    if (actionTypeFilter !== "All Actions") {
      // Filter labels are prose; log actions are SCREAMING_SNAKE codes.
      const normalised = actionTypeFilter.replace(/\s+/g, "_").toUpperCase();
      if (!log.action.toUpperCase().includes(normalised)) return false;
    }

    if (log.rawTimestamp) {
      const days = dateRange === "Today" ? 1 : dateRange === "Last 30 Days" ? 30 : 7;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      if (log.rawTimestamp.getTime() < cutoff) return false;
    }

    return true;
  });

  // Filters apply as you type, so the primary action here is taking the
  // filtered slice away with you.
  const handleExportLogs = () => {
    downloadCsv(datedFilename("audit-trail"), displayLogs, [
      { header: "Timestamp", value: (l) => l.timestamp },
      { header: "User", value: (l) => l.userName },
      { header: "Role", value: (l) => l.userRole },
      { header: "Action", value: (l) => l.action },
      { header: "Request", value: (l) => l.requestRef },
      { header: "Detail", value: (l) => l.verbatimFeedback },
      { header: "IP Address", value: (l) => l.ipAddress },
    ]);
  };

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
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "rgb(var(--color-text-muted))", textTransform: "uppercase" }}>TODAY'S LOGS</div>
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

      {/* Advanced Filter Section */}
      <div className="glass-panel" style={{ padding: "1.25rem 1.5rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem", marginBottom: "2rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: "1rem", alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", fontWeight: "600", marginBottom: "0.35rem" }}>Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={{ width: "100%", padding: "0.55rem 0.85rem", backgroundColor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "0.375rem", color: "rgb(var(--color-text))", fontSize: "0.85rem" }}
            >
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Today">Today</option>
              <option value="Last 30 Days">Last 30 Days</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", fontWeight: "600", marginBottom: "0.35rem" }}>User Name</label>
            <input
              type="text"
              placeholder="e.g. David Marsh"
              value={userNameFilter}
              onChange={(e) => setUserNameFilter(e.target.value)}
              style={{ width: "100%", padding: "0.55rem 0.85rem", backgroundColor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "0.375rem", color: "rgb(var(--color-text))", fontSize: "0.85rem", outline: "none" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", fontWeight: "600", marginBottom: "0.35rem" }}>Request ID</label>
            <input
              type="text"
              placeholder="REQ-0000"
              value={reqIdFilter}
              onChange={(e) => setReqIdFilter(e.target.value)}
              style={{ width: "100%", padding: "0.55rem 0.85rem", backgroundColor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "0.375rem", color: "rgb(var(--color-text))", fontSize: "0.85rem", outline: "none" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", fontWeight: "600", marginBottom: "0.35rem" }}>Action Type</label>
            <select
              value={actionTypeFilter}
              onChange={(e) => setActionTypeFilter(e.target.value)}
              style={{ width: "100%", padding: "0.55rem 0.85rem", backgroundColor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "0.375rem", color: "rgb(var(--color-text))", fontSize: "0.85rem" }}
            >
              <option value="All Actions">All Actions</option>
              <option value="Exceptional Approval">Exceptional Approval</option>
              <option value="Generate Payment Instruction">Generate Payment Instruction</option>
              <option value="Approve">Approve</option>
            </select>
          </div>

          <button
            onClick={handleExportLogs}
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
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)"
            }}
          >
            <Icons.Download size={15} /> Export Logs
          </button>
        </div>
      </div>

      {/* Logs Table Card */}
      <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", paddingBottom: "0.75rem" }}>TIMESTAMP</th>
              <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", paddingBottom: "0.75rem" }}>USER</th>
              <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", paddingBottom: "0.75rem" }}>ACTION</th>
              <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", paddingBottom: "0.75rem" }}>STATUS CHANGE</th>
              <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", paddingBottom: "0.75rem", textAlign: "right" }}>IP ADDRESS</th>
            </tr>
          </thead>
          <tbody>
            {displayLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              return (
                <React.Fragment key={log.id}>
                  <tr 
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    style={{ borderBottom: isExpanded ? "none" : "1px solid rgba(255, 255, 255, 0.05)", cursor: "pointer" }}
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
                        color: "#93c5fd",
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
                    <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", backgroundColor: "rgba(15, 23, 42, 0.4)" }}>
                      <td colSpan={5} style={{ padding: "0.5rem 1.5rem 1.25rem 1.5rem" }}>
                        <div style={{
                          backgroundColor: "rgba(15, 23, 42, 0.6)",
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
                              <span style={{ color: "#60a5fa", fontWeight: "600", cursor: "pointer" }}>
                                View Attachments ({log.attachmentsCount})
                              </span>
                            )}
                            <span style={{ color: "rgb(var(--color-text-muted))", cursor: "pointer" }}>Download Log</span>
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

        {/* Table Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.25rem", fontSize: "0.8rem", color: "rgb(var(--color-text-muted))" }}>
          <span>Showing 1-3 of 1,248 entries</span>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            <button style={{ padding: "0.25rem 0.5rem", background: "none", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "0.25rem", color: "rgb(var(--color-text-muted))" }}>&lt;</button>
            <button style={{ padding: "0.25rem 0.65rem", backgroundColor: "#2563eb", border: "none", borderRadius: "0.25rem", color: "#ffffff", fontWeight: "700" }}>1</button>
            <button style={{ padding: "0.25rem 0.65rem", background: "none", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "0.25rem", color: "rgb(var(--color-text-muted))" }}>2</button>
            <button style={{ padding: "0.25rem 0.65rem", background: "none", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "0.25rem", color: "rgb(var(--color-text-muted))" }}>3</button>
            <span style={{ padding: "0.25rem 0.5rem" }}>... 42</span>
            <button style={{ padding: "0.25rem 0.5rem", background: "none", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "0.25rem", color: "rgb(var(--color-text-muted))" }}>&gt;</button>
          </div>
        </div>
      </div>
    </div>
  );
};
