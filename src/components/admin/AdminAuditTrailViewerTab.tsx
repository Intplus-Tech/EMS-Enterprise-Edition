import React, { useState } from "react";
import * as Icons from "lucide-react";

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
  const [expandedLogId, setExpandedLogId] = useState<string | null>("log-1");

  const mockLogs = [
    {
      id: "log-1",
      timestamp: "Jul 15, 2026 10:45 AM",
      userBadge: "DM",
      userName: "David Marsh",
      userRole: "Finance Head",
      action: "Exceptional Approval",
      statusFrom: "Pending Exceptional Approval",
      statusTo: "Sent to Finance",
      ipAddress: "192.168.1.45",
      verbatimFeedback: '"Budget expansion approved per executive request. Documentation verified and attached for quarterly audit compliance."',
      attachmentsCount: 2
    },
    {
      id: "log-2",
      timestamp: "Jul 14, 2026 02:15 PM",
      userBadge: "SV",
      userName: "Sarah Voss",
      userRole: "Finance Officer",
      action: "Generate Payment Instruction",
      statusFrom: "Sent to Finance",
      statusTo: "Awaiting Bank Release",
      ipAddress: "192.168.1.22",
      verbatimFeedback: '"Uploaded generated payment instruction manifest to banking portal."',
      attachmentsCount: 1
    },
    {
      id: "log-3",
      timestamp: "Jul 13, 2026 11:30 AM",
      userBadge: "MS",
      userName: "Michael Scott",
      userRole: "Dept Manager",
      action: "Approve",
      statusFrom: "Pending Approval",
      statusTo: "Pending Exceptional Approval",
      ipAddress: "10.0.0.84",
      verbatimFeedback: '"Departmental budget cap exceeded by ₦400k. Route to Finance Head for exceptional override."',
      attachmentsCount: 0
    }
  ];

  const formattedLiveLogs = logs && logs.length > 0 ? logs.map((l: any) => ({
    id: l._id || l.id,
    timestamp: l.timestamp ? new Date(l.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A",
    userBadge: l.actorName ? l.actorName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "SYS",
    userName: l.actorName || "System Engine",
    userRole: l.actorRole || "System",
    action: l.action || "Log Event",
    statusFrom: l.details?.statusBefore || "System Event",
    statusTo: l.details?.statusAfter || l.action || "Completed",
    ipAddress: l.ipAddress || "192.168.1.1",
    verbatimFeedback: l.message ? `"${l.message}"` : '"No comment recorded."',
    attachmentsCount: l.details?.attachmentsCount || 0
  })) : null;

  const displayLogs = formattedLiveLogs || mockLogs;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#f8fafc" }}>Audit Trail Viewer</h1>
        <p style={{ fontSize: "0.9rem", color: "#94a3b8", marginTop: "0.25rem" }}>
          Comprehensive log of all system actions and status changes.
        </p>
      </div>

      {/* 4 Summary Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        {/* TODAY'S LOGS */}
        <div className="glass-panel" style={{ padding: "1.35rem", backgroundColor: "#1e293b", borderRadius: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icons.Eye size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>TODAY'S LOGS</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#f8fafc", marginTop: "0.15rem" }}>142</div>
            </div>
          </div>
        </div>

        {/* ANOMALIES */}
        <div className="glass-panel" style={{ padding: "1.35rem", backgroundColor: "#1e293b", borderRadius: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icons.ShieldAlert size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>ANOMALIES</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#f8fafc", marginTop: "0.15rem" }}>3</div>
            </div>
          </div>
        </div>

        {/* ACTIVE USERS */}
        <div className="glass-panel" style={{ padding: "1.35rem", backgroundColor: "#1e293b", borderRadius: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(99, 102, 241, 0.15)", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icons.Users size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>ACTIVE USERS</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#f8fafc", marginTop: "0.15rem" }}>24</div>
            </div>
          </div>
        </div>

        {/* LAST SYNC */}
        <div className="glass-panel" style={{ padding: "1.35rem", backgroundColor: "#1e293b", borderRadius: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icons.RefreshCw size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>LAST SYNC</div>
              <div style={{ fontSize: "1.35rem", fontWeight: "800", color: "#f8fafc", marginTop: "0.15rem" }}>Just Now</div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filter Section */}
      <div className="glass-panel" style={{ padding: "1.25rem 1.5rem", backgroundColor: "#1e293b", borderRadius: "0.75rem", marginBottom: "2rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: "1rem", alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", fontWeight: "600", marginBottom: "0.35rem" }}>Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={{ width: "100%", padding: "0.55rem 0.85rem", backgroundColor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "0.375rem", color: "#f8fafc", fontSize: "0.85rem" }}
            >
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Today">Today</option>
              <option value="Last 30 Days">Last 30 Days</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", fontWeight: "600", marginBottom: "0.35rem" }}>User Name</label>
            <input
              type="text"
              placeholder="e.g. David Marsh"
              value={userNameFilter}
              onChange={(e) => setUserNameFilter(e.target.value)}
              style={{ width: "100%", padding: "0.55rem 0.85rem", backgroundColor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "0.375rem", color: "#f8fafc", fontSize: "0.85rem", outline: "none" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", fontWeight: "600", marginBottom: "0.35rem" }}>Request ID</label>
            <input
              type="text"
              placeholder="REQ-0000"
              value={reqIdFilter}
              onChange={(e) => setReqIdFilter(e.target.value)}
              style={{ width: "100%", padding: "0.55rem 0.85rem", backgroundColor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "0.375rem", color: "#f8fafc", fontSize: "0.85rem", outline: "none" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", fontWeight: "600", marginBottom: "0.35rem" }}>Action Type</label>
            <select
              value={actionTypeFilter}
              onChange={(e) => setActionTypeFilter(e.target.value)}
              style={{ width: "100%", padding: "0.55rem 0.85rem", backgroundColor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "0.375rem", color: "#f8fafc", fontSize: "0.85rem" }}
            >
              <option value="All Actions">All Actions</option>
              <option value="Exceptional Approval">Exceptional Approval</option>
              <option value="Generate Payment Instruction">Generate Payment Instruction</option>
              <option value="Approve">Approve</option>
            </select>
          </div>

          <button
            onClick={() => alert("Applying audit trail log filters...")}
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
            <Icons.Filter size={15} /> Apply Filters
          </button>
        </div>
      </div>

      {/* Logs Table Card */}
      <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "#1e293b", borderRadius: "0.75rem" }}>
        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <th style={{ fontSize: "0.75rem", color: "#94a3b8", paddingBottom: "0.75rem" }}>TIMESTAMP</th>
              <th style={{ fontSize: "0.75rem", color: "#94a3b8", paddingBottom: "0.75rem" }}>USER</th>
              <th style={{ fontSize: "0.75rem", color: "#94a3b8", paddingBottom: "0.75rem" }}>ACTION</th>
              <th style={{ fontSize: "0.75rem", color: "#94a3b8", paddingBottom: "0.75rem" }}>STATUS CHANGE</th>
              <th style={{ fontSize: "0.75rem", color: "#94a3b8", paddingBottom: "0.75rem", textAlign: "right" }}>IP ADDRESS</th>
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
                    <td style={{ padding: "1.1rem 0", color: "#cbd5e1", fontSize: "0.85rem", width: "180px" }}>
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
                          <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "0.85rem" }}>{log.userName}</div>
                          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{log.userRole}</div>
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
                        <span style={{ backgroundColor: "rgba(148, 163, 184, 0.1)", color: "#cbd5e1", padding: "0.3rem 0.6rem", borderRadius: "0.25rem", fontSize: "0.75rem" }}>
                          {log.statusFrom}
                        </span>
                        <Icons.ArrowRight size={14} style={{ color: "#94a3b8" }} />
                        <span style={{ backgroundColor: "#2563eb", color: "#ffffff", padding: "0.3rem 0.6rem", borderRadius: "0.25rem", fontSize: "0.75rem", fontWeight: "600" }}>
                          {log.statusTo}
                        </span>
                      </div>
                    </td>

                    <td style={{ textAlign: "right", color: "#94a3b8", fontSize: "0.82rem", fontFamily: "monospace" }}>
                      {log.ipAddress}
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
                          <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <Icons.MessageSquare size={14} style={{ color: "#2563eb" }} /> VERBATIM FEEDBACK
                          </div>
                          <div style={{ fontSize: "0.85rem", color: "#f8fafc", fontStyle: "italic", marginBottom: "0.85rem" }}>
                            {log.verbatimFeedback}
                          </div>
                          <div style={{ display: "flex", gap: "1.25rem", fontSize: "0.8rem" }}>
                            {log.attachmentsCount > 0 && (
                              <span style={{ color: "#60a5fa", fontWeight: "600", cursor: "pointer" }}>
                                View Attachments ({log.attachmentsCount})
                              </span>
                            )}
                            <span style={{ color: "#94a3b8", cursor: "pointer" }}>Download Log</span>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.25rem", fontSize: "0.8rem", color: "#94a3b8" }}>
          <span>Showing 1-3 of 1,248 entries</span>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            <button style={{ padding: "0.25rem 0.5rem", background: "none", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "0.25rem", color: "#cbd5e1" }}>&lt;</button>
            <button style={{ padding: "0.25rem 0.65rem", backgroundColor: "#2563eb", border: "none", borderRadius: "0.25rem", color: "#ffffff", fontWeight: "700" }}>1</button>
            <button style={{ padding: "0.25rem 0.65rem", background: "none", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "0.25rem", color: "#cbd5e1" }}>2</button>
            <button style={{ padding: "0.25rem 0.65rem", background: "none", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "0.25rem", color: "#cbd5e1" }}>3</button>
            <span style={{ padding: "0.25rem 0.5rem" }}>... 42</span>
            <button style={{ padding: "0.25rem 0.5rem", background: "none", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "0.25rem", color: "#cbd5e1" }}>&gt;</button>
          </div>
        </div>
      </div>
    </div>
  );
};
